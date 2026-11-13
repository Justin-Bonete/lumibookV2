<?php
namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;

class ExpirePendingOrders extends Command
{
    protected $signature = 'lumibook:expire-orders';
    protected $description = 'Mark stale unpaid orders as expired (a late payment webhook can still activate them)';

    public function handle(): int
    {
        $n = Order::where('status', 'pending')->where('created_at', '<', now()->subHours(config('lumibook.pending_order_hours', 48)))->update(['status' => 'expired']);
        $this->info("Expired $n order(s).");
        return self::SUCCESS;
    }
}
