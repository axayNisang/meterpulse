import express, { Application, Request, Response } from 'express';
import { EventStore } from './storage/EventStore';
import { IdempotencyStore } from './storage/IdempotencyStore';
import { EventIngestionService } from './services/EventIngestionService';
import { AggregationEngine } from './services/AggregationEngine';
import { PricingEngine } from './services/PricingEngine';
import { InvoiceGenerator } from './services/InvoiceGenerator';
import { createBillingRouter } from './routes/api';
import { BillingPlan } from './types';

export function createApp(): Application {
  const app = express();
  app.use(express.json());

  // Instantiate core components
  const eventStore = new EventStore();
  const idempotencyStore = new IdempotencyStore();
  const ingestionService = new EventIngestionService(eventStore, idempotencyStore);
  const aggregationEngine = new AggregationEngine(eventStore);
  const pricingEngine = new PricingEngine();
  const invoiceGenerator = new InvoiceGenerator(aggregationEngine, pricingEngine);

  // Seed sample plan
  const samplePlans = new Map<string, BillingPlan>();
  samplePlans.set('plan_enterprise_api', {
    id: 'plan_enterprise_api',
    name: 'Enterprise Cloud API Plan',
    baseFee: 4900, // $49.00
    currency: 'USD',
    billingPeriodDays: 30,
    metrics: [
      {
        meterCode: 'api_requests',
        name: 'API Calls',
        aggregation: 'COUNT',
        pricingModel: 'TIERED_GRADUATED',
        tiers: [
          { upTo: 10000, unitPrice: 0 },         // first 10k free
          { upTo: 100000, unitPrice: 1 },        // 10k-100k: 1 cent per 10 calls ($0.001)
          { upTo: null, unitPrice: 0.5 }         // >100k: $0.0005
        ]
      },
      {
        meterCode: 'compute_seconds',
        name: 'Serverless Execution Duration',
        aggregation: 'SUM',
        pricingModel: 'PER_UNIT',
        tiers: [{ upTo: null, unitPrice: 0.02 }] // $0.0002 per sec
      }
    ]
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Mount API router
  app.use('/api/v1', createBillingRouter(ingestionService, aggregationEngine, invoiceGenerator, samplePlans));

  return app;
}
