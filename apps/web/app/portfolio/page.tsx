'use client';

import { useAuth } from '@/contexts/auth-context';

export default function PortfolioPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-gray-400">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0D0D0D] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Portfolio</h1>
          <p className="mt-2 text-gray-400">
            Welcome back, {user?.username}! View your trading portfolio and balance.
          </p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Total Balance Card */}
          <div className="rounded-lg border border-gray-800 bg-[#161616] p-6">
            <div className="text-sm text-gray-400">Total Balance</div>
            <div className="mt-2 text-3xl font-bold text-white">$10,000.00</div>
            <div className="mt-1 text-sm text-[#00C087]">+2.5% (24h)</div>
          </div>

          {/* Available Balance Card */}
          <div className="rounded-lg border border-gray-800 bg-[#161616] p-6">
            <div className="text-sm text-gray-400">Available Balance</div>
            <div className="mt-2 text-3xl font-bold text-white">$8,500.00</div>
            <div className="mt-1 text-sm text-gray-400">Ready to trade</div>
          </div>

          {/* In Orders Card */}
          <div className="rounded-lg border border-gray-800 bg-[#161616] p-6">
            <div className="text-sm text-gray-400">In Orders</div>
            <div className="mt-2 text-3xl font-bold text-white">$1,500.00</div>
            <div className="mt-1 text-sm text-gray-400">Locked in trades</div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="mt-8 rounded-lg border border-gray-800 bg-[#161616]">
          <div className="border-b border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Your Assets</h2>
          </div>
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="pb-3 text-sm font-medium text-gray-400">Asset</th>
                  <th className="pb-3 text-right text-sm font-medium text-gray-400">
                    Balance
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-gray-400">
                    USD Value
                  </th>
                  <th className="pb-3 text-right text-sm font-medium text-gray-400">
                    24h Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Mock Data */}
                <tr className="border-b border-gray-800">
                  <td className="py-4 text-sm text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                        BTC
                      </div>
                      <div>
                        <div className="font-medium">Bitcoin</div>
                        <div className="text-xs text-gray-400">BTC</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-right text-sm text-white">0.125</td>
                  <td className="py-4 text-right text-sm text-white">$5,000.00</td>
                  <td className="py-4 text-right text-sm text-[#00C087]">+2.45%</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 text-sm text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                        ETH
                      </div>
                      <div>
                        <div className="font-medium">Ethereum</div>
                        <div className="text-xs text-gray-400">ETH</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-right text-sm text-white">1.5</td>
                  <td className="py-4 text-right text-sm text-white">$3,500.00</td>
                  <td className="py-4 text-right text-sm text-[#00C087]">+1.82%</td>
                </tr>
                <tr>
                  <td className="py-4 text-sm text-white">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                        USDT
                      </div>
                      <div>
                        <div className="font-medium">Tether</div>
                        <div className="text-xs text-gray-400">USDT</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-right text-sm text-white">1,500.00</td>
                  <td className="py-4 text-right text-sm text-white">$1,500.00</td>
                  <td className="py-4 text-right text-sm text-gray-400">0.00%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 rounded-lg border border-gray-800 bg-[#161616] p-4">
          <p className="text-sm text-gray-400">
            💡 <strong>Note:</strong> This is a demo portfolio with mock data. In production,
            this will show your actual balance from the backend API.
          </p>
        </div>
      </div>
    </div>
  );
}
