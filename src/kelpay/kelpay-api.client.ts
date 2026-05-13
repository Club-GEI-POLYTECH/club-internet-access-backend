import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import {
  KELPAY_CHECK_TRANSACTION_URL,
  KELPAY_HTTP_RETRY,
  KELPAY_HTTP_TIMEOUT_MS,
  KELPAY_PAYMENT_URL,
} from './kelpay.constants';
import { KelpayParsedResponse, KelpayResponseKind } from './kelpay.types';
import { parseKelpayResponse } from './kelpay-response.util';
import { sanitizeKelpayRequestBody, truncateForLog } from './kelpay-logging.util';

@Injectable()
export class KelpayApiClient {
  private readonly logger = new Logger(KelpayApiClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private getMerchantCode(): string {
    return this.config.get<string>('KELPAY_MERCHANT_CODE', '');
  }

  /**
   * Doc Keccel : `Authorization: Bearer <token>` + `Content-Type: application/json`.
   * Basic auth uniquement si `KELPAY_USE_BASIC_AUTH=true` (hors doc officielle).
   */
  private buildAuthHeaders(): Record<string, string> {
    const token = (this.config.get<string>('KELPAY_TOKEN') ?? '').trim();
    const useBasic = this.config.get<string>('KELPAY_USE_BASIC_AUTH', '').toLowerCase() === 'true';
    const user = (this.config.get<string>('KELPAY_USERNAME') ?? '').trim();
    const pass = (this.config.get<string>('KELPAY_PASSWORD') ?? '').trim();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (useBasic && user && pass) {
      headers['Authorization'] = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
      return headers;
    }

    if (!token) {
      throw new Error(
        'KELPAY_TOKEN manquant (Bearer obligatoire pour l’API documentée). ' +
          'Pour tests Basic, définissez KELPAY_USE_BASIC_AUTH=true avec KELPAY_USERNAME / KELPAY_PASSWORD.',
      );
    }
    headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  private async postJson(
    url: string,
    body: Record<string, string>,
    responseKind: KelpayResponseKind,
  ): Promise<KelpayParsedResponse> {
    const cfg: AxiosRequestConfig = {
      headers: this.buildAuthHeaders(),
      timeout: KELPAY_HTTP_TIMEOUT_MS,
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt < KELPAY_HTTP_RETRY; attempt++) {
      try {
        const safeBody = sanitizeKelpayRequestBody(body);
        this.logger.log(
          `[backend → KELPAY] POST ${url} attempt=${attempt + 1}/${KELPAY_HTTP_RETRY} body=${JSON.stringify(safeBody)}`,
        );
        const res = await firstValueFrom(this.http.post<unknown>(url, body, cfg));
        const raw =
          typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? {});
        const parsed = parseKelpayResponse(raw, responseKind);
        this.logger.log(
          `[KELPAY → backend] POST ${url} httpStatus=${res.status ?? 'n/a'} body=${truncateForLog(raw)} | parsed code=${parsed.code ?? 'n/a'} transactionstatus=${parsed.transactionstatus ?? 'n/a'} transactionid=${parsed.transactionid ?? 'n/a'} ref=${parsed.reference ?? 'n/a'}`,
        );
        return parsed;
      } catch (err: any) {
        lastErr = err;
        const st = err?.response?.status;
        const data = err?.response?.data;
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data ?? {});
        this.logger.warn(
          `[KELPAY → backend] POST ${url} HTTP_ERROR attempt=${attempt + 1}/${KELPAY_HTTP_RETRY} httpStatus=${st ?? 'n/a'} body=${truncateForLog(dataStr)} axios=${err?.message ?? String(err)}`,
        );
        if (attempt < KELPAY_HTTP_RETRY - 1) {
          await this.sleep(500 * (attempt + 1));
        }
      }
    }
    throw lastErr;
  }

  async initiatePayment(params: {
    mobilenumber: string;
    reference: string;
    amount: number;
    currency: string;
    description: string;
    /** URL publique du webhook backend (requis par l’API payment.asp). */
    callbackurl?: string;
  }): Promise<KelpayParsedResponse> {
    const merchantcode = this.getMerchantCode();
    if (!merchantcode) {
      throw new Error('KELPAY_MERCHANT_CODE manquant');
    }
    return this.postJson(
      KELPAY_PAYMENT_URL,
      {
        merchantcode,
        mobilenumber: params.mobilenumber,
        reference: params.reference,
        amount: String(params.amount),
        currency: params.currency,
        description: params.description,
        callbackurl: (params.callbackurl ?? '').trim(),
      },
      KelpayResponseKind.PAYMENT_REQUEST,
    );
  }

  async checkTransaction(transactionId: string): Promise<KelpayParsedResponse> {
    const merchantcode = this.getMerchantCode();
    if (!merchantcode) {
      throw new Error('KELPAY_MERCHANT_CODE manquant');
    }
    return this.postJson(
      KELPAY_CHECK_TRANSACTION_URL,
      {
        merchantcode,
        transactionid: transactionId,
      },
      KelpayResponseKind.CHECK_TRANSACTION,
    );
  }
}
