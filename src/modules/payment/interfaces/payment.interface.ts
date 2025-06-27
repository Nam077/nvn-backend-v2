export interface PaymentInfo {
    orderId?: string;
    userId?: string;
    subscriptionId?: string;
    amount: number;
    gateway: string;
    content: string;
}

export interface ProcessedPayment {
    id: number;
    type: 'incoming' | 'outgoing';
    amount: number;
    gateway: string;
    referenceCode: string;
    processedAt: Date;
    linkedOrder?: string;
    status: 'processed' | 'failed';
}
