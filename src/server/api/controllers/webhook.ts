import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { WebhookService } from '../../services/webhook'
import { APIError } from '../types'
import { createSuccessResponse, createErrorResponse } from '../helpers'
import { logger } from '../logger/structured-logger'

export class WebhookController {
  private webhookService: WebhookService

  constructor(webhookService?: WebhookService) {
    this.webhookService = webhookService || new WebhookService()
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.webhookService.on('webhookCreated', (webhook) => {
      if (logger && logger.info) {
        logger.info('Webhook created', { webhookId: webhook.id, url: webhook.url })
      }
    })

    this.webhookService.on('webhookUpdated', (webhook) => {
      if (logger && logger.info) {
        logger.info('Webhook updated', { webhookId: webhook.id })
      }
    })

    this.webhookService.on('webhookDeleted', (webhook) => {
      if (logger && logger.info) {
        logger.info('Webhook deleted', { webhookId: webhook.id })
      }
    })

    this.webhookService.on('deliveryDelivered', ({ delivery, result }) => {
      if (logger && logger.info) {
        logger.info('Webhook delivery successful', {
          deliveryId: delivery.id,
          statusCode: result.statusCode,
          duration: result.duration,
        })
      }
    })

    this.webhookService.on('deliveryFailed', (delivery) => {
      if (logger && logger.error) {
        logger.error('Webhook delivery failed', {
          deliveryId: delivery.id,
          error: delivery.error,
          attempt: delivery.attempt,
        })
      }
    })
  }

  public createWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json(createErrorResponse('Validation failed', errors.array()))
        return
      }

      const {
        url, enabled = true, events, secret, headers, timeout, retryAttempts, retryDelay,
      } = req.body

      const webhook = await this.webhookService.createWebhook({
        url,
        enabled,
        events,
        secret,
        headers,
        timeout,
        retryAttempts,
        retryDelay,
      })

      res.status(201).json(createSuccessResponse({
        id: webhook.id,
        url: webhook.url,
        enabled: webhook.enabled,
        events: webhook.events,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      }, 'Webhook created successfully'))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error creating webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to create webhook'))
    }
  }

  public getWebhooks = async (req: Request, res: Response): Promise<void> => {
    try {
      const { enabled } = req.query

      let webhooks
      if (enabled === 'true') {
        webhooks = this.webhookService.getEnabledWebhooks()
      } else {
        webhooks = this.webhookService.getAllWebhooks()
      }

      const webhookData = webhooks.map(webhook => ({
        id: webhook.id,
        url: webhook.url,
        enabled: webhook.enabled,
        events: webhook.events,
        timeout: webhook.timeout,
        retryAttempts: webhook.retryAttempts,
        retryDelay: webhook.retryDelay,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      }))

      res.json(createSuccessResponse({
        webhooks: webhookData,
        total: webhookData.length,
      }))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error getting webhooks', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to get webhooks'))
    }
  }

  public getWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const webhook = this.webhookService.getWebhook(id)
      if (!webhook) {
        res.status(404).json(createErrorResponse('Webhook not found'))
        return
      }

      res.json(createSuccessResponse({
        id: webhook.id,
        url: webhook.url,
        enabled: webhook.enabled,
        events: webhook.events,
        secret: webhook.secret ? '***' : undefined,
        headers: webhook.headers,
        timeout: webhook.timeout,
        retryAttempts: webhook.retryAttempts,
        retryDelay: webhook.retryDelay,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      }))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error getting webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to get webhook'))
    }
  }

  public updateWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json(createErrorResponse('Validation failed', errors.array()))
        return
      }

      const { id } = req.params
      const updates = req.body

      const webhook = await this.webhookService.updateWebhook(id, updates)

      res.json(createSuccessResponse({
        id: webhook.id,
        url: webhook.url,
        enabled: webhook.enabled,
        events: webhook.events,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      }, 'Webhook updated successfully'))
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse('Webhook not found'))
        return
      }

      if (logger && logger.error) {
        logger.error('Error updating webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to update webhook'))
    }
  }

  public deleteWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const deleted = await this.webhookService.deleteWebhook(id)
      if (!deleted) {
        res.status(404).json(createErrorResponse('Webhook not found'))
        return
      }

      res.json(createSuccessResponse(null, 'Webhook deleted successfully'))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error deleting webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to delete webhook'))
    }
  }

  public testWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const result = await this.webhookService.testWebhook(id)

      res.json(createSuccessResponse({
        webhookId: result.webhookId,
        url: result.url,
        success: result.success,
        statusCode: result.statusCode,
        response: result.response,
        error: result.error,
        duration: result.duration,
        timestamp: result.timestamp,
      }, 'Webhook test completed'))
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse('Webhook not found'))
        return
      }

      if (logger && logger.error) {
        logger.error('Error testing webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to test webhook'))
    }
  }

  public subscribeToEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json(createErrorResponse('Validation failed', errors.array()))
        return
      }

      const { id } = req.params
      const { eventType, filter } = req.body

      const subscription = await this.webhookService.subscribeToEvent(id, eventType, filter)

      res.status(201).json(createSuccessResponse({
        id: subscription.id,
        webhookId: subscription.webhookId,
        eventType: subscription.eventType,
        filter: subscription.filter,
        enabled: subscription.enabled,
        createdAt: subscription.createdAt,
      }, 'Event subscription created successfully'))
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse('Webhook not found'))
        return
      }

      if (logger && logger.error) {
        logger.error('Error subscribing to event', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to subscribe to event'))
    }
  }

  public getSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const subscriptions = this.webhookService.getSubscriptions(id)

      res.json(createSuccessResponse({
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          webhookId: sub.webhookId,
          eventType: sub.eventType,
          filter: sub.filter,
          enabled: sub.enabled,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        })),
        total: subscriptions.length,
      }))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error getting subscriptions', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to get subscriptions'))
    }
  }

  public unsubscribeFromEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, subscriptionId } = req.params

      const unsubscribed = await this.webhookService.unsubscribeFromEvent(id, subscriptionId)
      if (!unsubscribed) {
        res.status(404).json(createErrorResponse('Subscription not found'))
        return
      }

      res.json(createSuccessResponse(null, 'Event subscription cancelled successfully'))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error unsubscribing from event', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to unsubscribe from event'))
    }
  }

  public getDeliveries = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const { status, limit = 50, offset = 0 } = req.query

      let deliveries = this.webhookService.getWebhookDeliveries(id)

      if (status) {
        deliveries = deliveries.filter(d => d.status === status)
      }

      const total = deliveries.length
      const paginatedDeliveries = deliveries
        .slice(Number(offset), Number(offset) + Number(limit))
        .map(delivery => ({
          id: delivery.id,
          webhookId: delivery.webhookId,
          eventId: delivery.eventId,
          status: delivery.status,
          statusCode: delivery.statusCode,
          attempt: delivery.attempt,
          timestamp: delivery.timestamp,
          nextRetryAt: delivery.nextRetryAt,
          error: delivery.error,
        }))

      res.json(createSuccessResponse({
        deliveries: paginatedDeliveries,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total,
        },
      }))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error getting deliveries', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to get deliveries'))
    }
  }

  public getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.webhookService.getStats()

      res.json(createSuccessResponse({
        totalWebhooks: stats.totalWebhooks,
        enabledWebhooks: stats.enabledWebhooks,
        totalDeliveries: stats.totalDeliveries,
        successfulDeliveries: stats.successfulDeliveries,
        failedDeliveries: stats.failedDeliveries,
        pendingDeliveries: stats.pendingDeliveries,
        averageResponseTime: Math.round(stats.averageResponseTime),
        lastDelivery: stats.lastDelivery,
      }))
    } catch (error) {
      if (logger && logger.error) {
        logger.error('Error getting stats', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to get stats'))
    }
  }

  public enableWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const webhook = await this.webhookService.enableWebhook(id)

      res.json(createSuccessResponse({
        id: webhook.id,
        enabled: webhook.enabled,
      }, 'Webhook enabled successfully'))
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse('Webhook not found'))
        return
      }

      if (logger && logger.error) {
        logger.error('Error enabling webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to enable webhook'))
    }
  }

  public disableWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const webhook = await this.webhookService.disableWebhook(id)

      res.json(createSuccessResponse({
        id: webhook.id,
        enabled: webhook.enabled,
      }, 'Webhook disabled successfully'))
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json(createErrorResponse('Webhook not found'))
        return
      }

      if (logger && logger.error) {
        logger.error('Error disabling webhook', { error: error instanceof Error ? error.message : 'Unknown error' })
      }
      res.status(500).json(createErrorResponse('Failed to disable webhook'))
    }
  }
}
