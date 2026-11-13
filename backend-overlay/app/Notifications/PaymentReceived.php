<?php
namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class PaymentReceived extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}
    public function via($notifiable): array { return ['mail']; }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your LUMIBOOK membership is active')
            ->greeting("Hi {$notifiable->name},")
            ->line("Thanks for your payment. Your {$this->order->plan->name} membership is now active.")
            ->line("Order number: {$this->order->order_number}")
            ->action('Open your library', rtrim(config('lumibook.frontend_url'), '/') . '/app/library')
            ->line('Keep this email for your records. PayMongo also sends its own payment receipt.');
    }
}
