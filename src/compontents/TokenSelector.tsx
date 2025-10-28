import React, { useEffect } from 'react';
import { TokenSearchData } from '~types';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  BarChart3,
  CircleX,
  ChevronLeft,
} from 'lucide-react';

interface TokenSelectorProps {
  searchResults: TokenSearchData[];
  onSelectToken: (token: TokenSearchData) => void;
  onBack: () => void;
  onClose: () => void;
}

export function TokenSelector({
  searchResults,
  onSelectToken,
  onBack,
  onClose,
}: TokenSelectorProps) {
  const formatNumber = (num: string) => {
    const value = parseFloat(num);
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const formatPrice = (price: string) => {
    const value = parseFloat(price);
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(6)}`;
  };

  if (!searchResults || searchResults.length === 0) {
    return (
      <div className='w-[800px] rounded-xl shadow-2xl overflow-hidden theme-border'>
        {/* Header */}
        <div className='flex items-center justify-between px-3 py-1.5 theme-border border-b theme-bg-secondary backdrop-blur-md'>
          <div className='flex items-center gap-2'>
            <div
              className='p-1 rounded-full theme-hover transition-colors cursor-pointer'
              onClick={onBack}
            >
              <ChevronLeft className='w-4 h-4 theme-text-primary' />
            </div>
            <h3 className='text-base font-semibold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent'>
              Select Token
            </h3>
          </div>
          <div
            className='p-1.5 rounded-full theme-hover transition-colors cursor-pointer'
            onClick={onClose}
          >
            <CircleX className='w-4 h-4 theme-text-secondary' />
          </div>
        </div>

        {/* Empty State */}
        <div className='h-[400px] flex flex-col items-center justify-center gap-6 theme-text-primary theme-bg-secondary backdrop-blur-md'>
          <div className='w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center'>
            <BarChart3 className='w-8 h-8 text-blue-400' />
          </div>
          <div className='text-center space-y-2'>
            <h3 className='text-lg font-semibold theme-text-primary'>
              No Tokens Found
            </h3>
            <p className='text-sm theme-text-secondary'>
              Try searching for a different token
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-[800px] rounded-xl shadow-2xl overflow-hidden theme-border'>
      {/* Header */}
      <div className='flex items-center justify-between px-3 py-1.5 theme-border border-b theme-bg-secondary backdrop-blur-md'>
        <div className='flex items-center gap-2'>
          <div
            className='p-1 rounded-full theme-hover transition-colors cursor-pointer'
            onClick={onBack}
          >
            <ChevronLeft className='w-4 h-4 theme-text-primary' />
          </div>
          <h3 className='text-base font-semibold theme-text-primary'>
            Select Token
          </h3>
        </div>
        <div
          className='p-1.5 rounded-full theme-hover transition-colors cursor-pointer'
          onClick={onClose}
        >
          <CircleX className='w-4 h-4 theme-text-secondary' />
        </div>
      </div>

      {/* Token List */}
      <div className='h-[400px] overflow-y-auto custom-scrollbar theme-bg-secondary backdrop-blur-md'>
        <div className='p-2 space-y-1'>
          {searchResults.map((token, index) => {
            const changeValue = parseFloat(token.change);
            const isPositive = changeValue >= 0;

            return (
              <div
                key={`${token.tokenContractAddress}-${index}`}
                onClick={() => onSelectToken(token)}
                className='p-2 rounded-lg cursor-pointer hover:theme-bg-primary transition-all duration-200 group border border-transparent hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/10 relative overflow-hidden'
              >
                {/* Hover gradient overlay */}
                <div className='absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200'></div>

                <div className='relative flex items-center'>
                  <div className='flex items-center gap-2 w-[140px]'>
                    <img
                      src={token.tokenLogoUrl}
                      alt={token.tokenSymbol}
                      className='w-6 h-6 rounded-full'
                      onError={(e) => {
                        e.currentTarget.src =
                          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik02IDJMODUgNkg2LjVWNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02IDEwTDQuNSA4SDcuNUw2IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==';
                      }}
                    />
                    <div className='min-w-0'>
                      <h4 className='text-sm font-semibold theme-text-primary group-hover:text-blue-400 transition-colors truncate'>
                        {token.tokenSymbol}
                      </h4>
                      <p className='text-xs theme-text-secondary truncate'>
                        {token.tokenName}
                      </p>
                    </div>
                  </div>

                  {/* Center Section - Contract Address */}
                  <div className='flex-1 flex justify-center px-4'>
                    <div className='text-xs theme-text-secondary font-mono text-center'>
                      {token.tokenContractAddress.slice(0, 6)}...
                      {token.tokenContractAddress.slice(-6)}
                    </div>
                  </div>

                  {/* Right Section - Price Info */}
                  <div className='text-right w-[100px]'>
                    <div className='text-sm font-semibold theme-text-primary'>
                      {formatPrice(token.price)}
                    </div>
                    <div
                      className={`flex items-center justify-end gap-1 text-xs ${
                        isPositive ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className='w-3 h-3' />
                      ) : (
                        <TrendingDown className='w-3 h-3' />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {token.change}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
