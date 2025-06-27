import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class SepayWebhookDto {
    @IsNumber()
    id: number; // ID giao dịch trên SePay

    @IsString()
    gateway: string; // Brand name của ngân hàng

    @IsString()
    transactionDate: string; // Thời gian xảy ra giao dịch phía ngân hàng

    @IsString()
    accountNumber: string; // Số tài khoản ngân hàng

    @IsOptional()
    @IsString()
    code?: string | null; // Mã code thanh toán (sepay tự nhận diện dựa vào cấu hình)

    @IsString()
    content: string; // Nội dung chuyển khoản

    @IsIn(['in', 'out'])
    transferType: 'in' | 'out'; // Loại giao dịch. in là tiền vào, out là tiền ra

    @IsNumber()
    transferAmount: number; // Số tiền giao dịch

    @IsNumber()
    accumulated: number; // Số dư tài khoản (lũy kế)

    @IsOptional()
    @IsString()
    subAccount?: string | null; // Tài khoản ngân hàng phụ (tài khoản định danh)

    @IsString()
    referenceCode: string; // Mã tham chiếu của tin nhắn sms

    @IsString()
    description: string; // Toàn bộ nội dung tin nhắn sms
}
