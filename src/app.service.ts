import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Club Internet Access API — UNIKIN';
  }
}

