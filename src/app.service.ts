import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Internet Access Management API - UNIKIN';
  }
}

