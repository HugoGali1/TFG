import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import type { Request } from 'express';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('config')
  @ApiOperation({ summary: 'Indica si el servidor tiene Stripe configurado' })
  config() {
    return { stripeEnabled: this.paymentsService.isStripeEnabled };
  }

  @Post('create-intent')
  @ApiOperation({ summary: 'Crear PaymentIntent de Stripe y registrar pago pendiente' })
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simular pago succeeded (demo, sin Stripe)' })
  simulate(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.simulate(dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook de Stripe (no llamar directamente)' })
  webhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody as Buffer);
  }

  @Post(':id/sync')
  @ApiOperation({
    summary: 'Reconciliar un pago con Stripe (respaldo cuando no hay webhook)',
  })
  sync(@Param('id') id: string) {
    return this.paymentsService.syncFromStripe(id);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Pagos de una sesión' })
  findBySession(@Param('sessionId') sessionId: string) {
    return this.paymentsService.findBySession(sessionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pago por ID' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }
}
