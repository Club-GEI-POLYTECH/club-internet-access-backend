import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatus } from '../entities/payment.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async create(@Body() createDto: CreatePaymentDto, @Request() req) {
    return await this.paymentService.create(createDto, req.user.userId);
  }

  @Post(':id/complete')
  async completePayment(@Param('id') id: string, @Body() body: { transactionId?: string }) {
    return await this.paymentService.completePayment(id, body.transactionId);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: PaymentStatus },
  ) {
    return await this.paymentService.updateStatus(id, body.status);
  }

  @Get()
  async findAll() {
    return await this.paymentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.paymentService.findOne(id);
  }

  @Get('transaction/:transactionId')
  async findByTransactionId(@Param('transactionId') transactionId: string) {
    return await this.paymentService.findByTransactionId(transactionId);
  }
}

