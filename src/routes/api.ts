import { Router, Request, Response } from 'express';
import { EventIngestionService } from '../services/EventIngestionService';
import { AggregationEngine } from '../services/AggregationEngine';
import { InvoiceGenerator } from '../services/InvoiceGenerator';
import { BillingPlan } from '../types';

export function createBillingRouter(
  ingestionService: EventIngestionService,
  aggregationEngine: AggregationEngine,
  invoiceGenerator: InvoiceGenerator,
  plans: Map<string, BillingPlan>
): Router {
  const router = Router();

  // Single event ingestion
  router.post('/events', (req: Request, res: Response) => {
    try {
      const result = ingestionService.ingest(req.body);
      const statusCode = result.status === 'DUPLICATE' ? 200 : 202;
      return res.status(statusCode).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Batch event ingestion
  router.post('/events/batch', (req: Request, res: Response) => {
    try {
      if (!Array.isArray(req.body.events)) {
        return res.status(400).json({ error: 'Body must contain an array under the events key' });
      }
      const results = ingestionService.ingestBatch(req.body.events);
      return res.status(202).json({
        total: results.length,
        accepted: results.filter(r => r.status === 'ACCEPTED').length,
        duplicates: results.filter(r => r.status === 'DUPLICATE').length,
        results
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Query aggregated metric for a customer
  router.get('/usage/:customerId', (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { meterCode, aggregation, start, end } = req.query;

      if (!meterCode || !aggregation) {
        return res.status(400).json({ error: 'meterCode and aggregation query parameters are required' });
      }

      const periodStart = start ? new Date(String(start)) : new Date(Date.now() - 30 * 86400000);
      const periodEnd = end ? new Date(String(end)) : new Date();

      const usage = aggregationEngine.aggregate(
        customerId,
        String(meterCode),
        aggregation as any,
        periodStart,
        periodEnd
      );

      return res.json(usage);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Generate real-time invoice
  router.post('/invoices/generate', (req: Request, res: Response) => {
    try {
      const { customerId, planId, start, end, taxRatePercent } = req.body;
      const plan = plans.get(planId);

      if (!plan) {
        return res.status(404).json({ error: `Plan '${planId}' not found` });
      }

      const periodStart = new Date(start);
      const periodEnd = new Date(end);

      const invoice = invoiceGenerator.generate(
        customerId,
        plan,
        periodStart,
        periodEnd,
        Number(taxRatePercent || 0)
      );

      return res.json(invoice);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  return router;
}
