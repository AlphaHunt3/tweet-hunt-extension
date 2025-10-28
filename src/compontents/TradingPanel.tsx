import React, { useEffect, useState } from 'react';
import { TokenSearchData } from '~types';
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Users,
  DollarSign,
  BarChart3,
  CircleX,
  Sparkles,
  ChevronLeft,
  Copy,
  LogOut,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';

// 交易历史记录类型
interface SwapHistory {
  id: string;
  timestamp: number;
  fromToken: string;
  fromAmount: string;
  toToken: string;
  toTokenSymbol: string;
  toTokenLogo: string;
  estimatedAmount: string;
  signature: string;
  status: 'success' | 'pending' | 'failed';
}

interface TradingPanelProps {
  tokenData: TokenSearchData;
  onBack: () => void;
  onClose: () => void;
  fromTokenSelector?: boolean; // 是否来自TokenSelector
}

export function TradingPanel({
  tokenData,
  onBack,
  onClose,
  fromTokenSelector = false,
}: TradingPanelProps) {
  const { t } = useI18n();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [solBalance, setSolBalance] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [solAmount, setSolAmount] = useState<string>('');
  const [estimatedTokenAmount, setEstimatedTokenAmount] =
    useState<string>('0.00');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<string>(''); // 交易状态提示
  const [swapStatusType, setSwapStatusType] = useState<
    'success' | 'error' | 'info'
  >('info'); // 状态类型
  const [slippage] = useState<string>('0.5'); // 默认滑点0.5%
  const [swapHistory, setSwapHistory] = useState<SwapHistory[]>([]); // 交易历史

  // 从 localStorage 加载交易历史
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('xhunt_swap_history');
        if (stored) {
          const history: SwapHistory[] = JSON.parse(stored);
          setSwapHistory(history.slice(0, 10)); // 只保留最近 10 笔
        }
      } catch (error) {
        console.error('Failed to load swap history:', error);
      }
    };
    loadHistory();
  }, []);

  // 保存交易历史到 localStorage
  const saveSwapHistory = (newSwap: SwapHistory) => {
    try {
      const updated = [newSwap, ...swapHistory].slice(0, 10); // 最多保存 10 笔
      setSwapHistory(updated);
      localStorage.setItem('xhunt_swap_history', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save swap history:', error);
    }
  };

  const formatNumber = (num: string) => {
    const value = parseFloat(num);
    if (isNaN(value) || value === null || value === undefined) return null;
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

  const formatSolBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  const connectPhantomWallet = async () => {
    setIsConnecting(true);
    try {
      // 通过background script连接Phantom钱包
      const response = await chrome.runtime.sendMessage({
        type: 'CONNECT_WALLET',
      });

      if (response.success && response.data) {
        const { address } = response.data;
        setWalletAddress(address);
        setWalletConnected(true);

        // 连接成功后立即获取SOL余额
        await fetchSolBalance(address);
      } else {
        throw new Error(response.error || '连接钱包失败');
      }
    } catch (error) {
      console.error('连接Phantom钱包失败:', error);
      alert('连接钱包失败，请重试');
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchSolBalance = async (address: string) => {
    setIsLoadingBalance(true);
    try {
      console.log('开始获取SOL余额，地址:', address);

      const response = await chrome.runtime.sendMessage({
        type: 'SOLANA_BALANCE_REQUEST',
        address: address,
      });

      console.log('余额API响应:', response);

      if (response.success && response.data) {
        const { balance } = response.data;
        setSolBalance(formatSolBalance(balance));
        console.log('SOL余额获取成功:', balance);
      } else {
        console.log('余额API响应错误:', response);
        setSolBalance('0.0000');
      }
    } catch (error) {
      console.error('获取SOL余额失败:', error);
      setSolBalance('0.0000');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setSolBalance('');
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    // 可以添加一个toast提示
  };

  const refreshBalance = () => {
    if (walletConnected && walletAddress) {
      fetchSolBalance(walletAddress);
    }
  };

  // 处理SOL金额输入，限制最多四位小数
  const handleSolAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // 允许空字符串
    if (value === '') {
      setSolAmount('');
      setEstimatedTokenAmount('0.00');
      return;
    }

    // 正则表达式：允许数字和最多四位小数
    const regex = /^\d*\.?\d{0,4}$/;

    if (regex.test(value)) {
      setSolAmount(value);
      // TODO: 可以在这里添加实时价格估算
    }
  };

  // 调用OKX DEX Swap指令API
  const fetchSwapInstruction = async () => {
    if (!walletAddress || !solAmount || parseFloat(solAmount) <= 0) {
      alert('请输入有效的SOL数量');
      return;
    }

    setIsSwapping(true);
    try {
      // SOL的精度是9，所以需要乘以10^9
      const amountInLamports = Math.floor(
        parseFloat(solAmount) * 1e9
      ).toString();

      /**
       * 构建OKX DEX Swap API请求参数
       *
       * 必填参数：
       * @param chainIndex - 链的唯一标识（501: Solana）
       * @param amount - 币种询价数量（需包含精度，如兑换1.00 USDT需输入1000000，兑换1.00 DAI需输入1000000000000000000）
       * @param fromTokenAddress - 询价币种合约地址（如：11111111111111111111111111111111为SOL）
       * @param toTokenAddress - 目标币种合约地址
       * @param slippagePercent - 滑点限制（EVM网络：0-100，Solana网络：0-<100，如0.5代表最大滑点0.5%）
       * @param userWalletAddress - 用户钱包地址
       *
       * 可选参数：
       * @param swapReceiverAddress - 购买的资产的收件人地址，如未设置则用户钱包地址收到购买的资产
       * @param feePercent - 发送到分佣地址的询价或目标币种数量百分比（最小>0，Solana链最大10，其他链最大3，最多支持小数点后9位）
       * @param fromTokenReferrerWalletAddress - 收取fromToken分佣费用的钱包地址（需结合feePercent设置，单笔交易只能选择fromToken或toToken分佣）
       *                                         注意：对于Solana，分佣地址需提前存入一些SOL进行激活
       * @param toTokenReferrerWalletAddress - 收取toToken分佣费用的钱包地址（需结合feePercent设置，单笔交易只能选择fromToken或toToken分佣）
       *                                       注意：对于Solana，分佣地址需提前存入一些SOL进行激活
       * @param dexIds - 限定询价的流动性池dexId，多个组合按,分隔（如1,50,180）
       * @param excludeDexIds - 限定不会使用于询价的流动性池dexId，多个组合按,分隔（如1,50,180）
       * @param disableRFQ - 禁用所有被归类为RFQ且依赖时效性报价的流动性来源（默认false）
       * @param directRoute - 启用后将限制路由仅使用单一流动性池（默认false，当前仅适用于Solana兑换）
       * @param autoSlippage - 默认false。当设置为true时，原slippagePercent参数将被autoSlippage覆盖，基于当前市场数据计算自动滑点
       * @param maxAutoSlippagePercent - 当autoSlippage为true时，此值为API返回的autoSlippage的最大上限（如0.5代表0.5%），建议采用此值控制风险
       * @param priceImpactProtectionPercent - 允许的价格影响百分比（0-100之间，默认90%）当估算的价格影响超过指定百分比时返回错误。设置为100时禁用此功能
       * @param positiveSlippagePercent - 【仅对白名单或企业用户开放】对报价改善部分收取费用（不超过报价总额10%，最多支持小数点后1位，默认0，目前仅支持Solana链）
       * @param positiveSlippageFeeAddress - 收取正滑点分佣费用的钱包地址（需结合positiveSlippagePercent设置，若未填入则使用收取分佣费用的钱包地址）
       * @param computeUnitPrice - 用于Solana网络上的交易，类似于Ethereum上的gasPrice，价格越高交易越有可能更快被网络处理
       * @param computeUnitLimit - 用于Solana网络上的交易，类似于Ethereum上的gasLimit，确保交易不会占用过多计算资源
       */
      const params = new URLSearchParams({
        chainIndex: '501',
        amount: amountInLamports,
        fromTokenAddress: '11111111111111111111111111111111',
        toTokenAddress: tokenData.tokenContractAddress,
        slippagePercent: slippage,
        userWalletAddress: walletAddress,
      });

      const apiUrl = `https://minibridge-backend.chaineye.tools/okxdexapi/api/v6/dex/aggregator/swap?${params.toString()}`;

      console.log('调用Swap API:', apiUrl);

      const response = await fetch(apiUrl);
      const data = await response.json();

      console.log('Swap API响应:', data);

      if (data.code === '0' && data.data && data.data.length > 0) {
        // OKX /swap API 返回的 data 是数组，取第一个元素
        const swapData = data.data[0];

        // 获取预估的目标token数量
        const toTokenAmount = swapData.routerResult?.toTokenAmount || '0';
        const toTokenDecimal = swapData.routerResult?.toToken?.decimal || '6';
        const estimatedAmount =
          parseFloat(toTokenAmount) / Math.pow(10, parseInt(toTokenDecimal));
        setEstimatedTokenAmount(estimatedAmount.toFixed(6));

        setSwapStatus(t('tradingPanel.waitingWalletConfirm'));
        setSwapStatusType('info');

        // 通过background script执行交易
        const txResponse = await chrome.runtime.sendMessage({
          type: 'EXECUTE_SWAP',
          data: swapData, // 传入 data.data[0]，包含 tx.data
        });

        if (txResponse.success) {
          const signature = txResponse.data?.signature;
          console.log('交易签名:', signature);

          // 保存交易历史
          if (signature) {
            const newSwap: SwapHistory = {
              id: signature,
              timestamp: Date.now(),
              fromToken: 'SOL',
              fromAmount: solAmount,
              toToken: tokenData.tokenContractAddress,
              toTokenSymbol: tokenData.tokenSymbol,
              toTokenLogo: tokenData.tokenLogoUrl,
              estimatedAmount: estimatedTokenAmount,
              signature: signature,
              status: 'success',
            };
            saveSwapHistory(newSwap);
          }

          setSwapStatus(t('tradingPanel.swapSuccess'));
          setSwapStatusType('success');

          // 清空输入
          setSolAmount('');
          setEstimatedTokenAmount('0.00');

          // 5秒后刷新余额并清除提示
          setTimeout(async () => {
            await fetchSolBalance(walletAddress);
            setSwapStatus('');
            setSwapStatusType('info');
          }, 5000);
        } else {
          throw new Error(txResponse.error || '交易失败');
        }
      } else {
        throw new Error(data.msg || '获取交易指令失败');
      }
    } catch (error) {
      console.error('Swap失败:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      setSwapStatus(`${t('tradingPanel.swapFailed')}${errorMsg}`);
      setSwapStatusType('error');

      // 5秒后清除错误提示
      setTimeout(() => {
        setSwapStatus('');
        setSwapStatusType('info');
      }, 5000);
    } finally {
      setIsSwapping(false);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('tradingPanel.justNow');
    if (minutes < 60) return `${minutes}${t('tradingPanel.minutesAgo')}`;
    if (hours < 24) return `${hours}${t('tradingPanel.hoursAgo')}`;
    return `${days}${t('tradingPanel.daysAgo')}`;
  };

  // 格式化交易金额（支持小数）
  const formatSwapAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;

    // 如果大于等于0.01，显示最多4位小数
    if (num >= 0.01) {
      return num.toFixed(4).replace(/\.?0+$/, '');
    }

    // 如果小于0.01，显示最多6位小数
    return num.toFixed(6).replace(/\.?0+$/, '');
  };

  const changeValue = parseFloat(tokenData.change);
  const isPositive = changeValue >= 0;

  return (
    <div className='w-[800px] rounded-xl shadow-2xl overflow-hidden theme-border theme-bg-secondary'>
      {/* Header */}
      <div className='flex items-center justify-between px-3 py-1.5 theme-border border-b backdrop-blur-md'>
        <div className='flex items-center gap-2'>
          <div
            className='p-1 rounded-full theme-hover transition-colors cursor-pointer'
            onClick={onBack}
          >
            <ChevronLeft className='w-4 h-4 theme-text-primary' />
          </div>
          <img
            src={tokenData.tokenLogoUrl}
            alt={tokenData.tokenSymbol}
            className='w-6 h-6 rounded-full'
            onError={(e) => {
              e.currentTarget.src =
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik02IDJMODUgNkg2LjVWNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02IDEwTDQuNSA4SDcuNUw2IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==';
            }}
          />
          <h3 className='text-sm font-semibold theme-text-primary'>
            {tokenData.tokenSymbol}
          </h3>
        </div>
        <div
          className='p-1.5 rounded-full theme-hover transition-colors cursor-pointer'
          onClick={onClose}
        >
          <CircleX className='w-4 h-4 theme-text-secondary' />
        </div>
      </div>

      {/* Content */}
      <div className='h-[auto] max-h-[800px] overflow-y-auto custom-scrollbar backdrop-blur-md'>
        <div className='p-2 space-y-2'>
          {/* Chart - Full Width */}
          <div className='theme-bg-primary rounded-lg p-2 theme-border'>
            <div className='border dark:border-gray-800/50 border-gray-300/50 dark:bg-gray-900/50 bg-gray-100/80 backdrop-blur rounded-xl h-[280px] relative overflow-hidden'>
              <div className='absolute z-1 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400'></div>
              </div>
              <div className='w-full h-[380px] relative'>
                <iframe
                  src={`https://dexscreener.com/solana/${tokenData.tokenContractAddress}?embed=1&trades=0&info=0&widgetbar=0&interval=15`}
                  className='w-full h-full rounded-lg absolute left-0 right-0 top-0 bottom-0 z-2'
                />
              </div>
            </div>
          </div>

          {/* Info and Swap - Side by Side */}
          <div className='grid grid-cols-2 gap-2'>
            {/* Left - Token Info */}
            <div className='theme-bg-primary rounded-lg p-2.5 theme-border'>
              <div className='flex items-center gap-2 mb-2'>
                <img
                  src={tokenData.tokenLogoUrl}
                  alt={tokenData.tokenSymbol}
                  className='w-6 h-6 rounded-full'
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik02IDJMODUgNkg2LjVWNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02IDEwTDQuNSA4SDcuNUw2IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==';
                  }}
                />
                <div>
                  <h3 className='text-sm font-bold theme-text-primary'>
                    {tokenData.tokenSymbol}
                  </h3>
                  <p className='text-xs theme-text-secondary'>
                    {tokenData.tokenName}
                  </p>
                </div>
              </div>

              {/* Price and Change */}
              <div className='mb-2 flex items-center gap-2'>
                <div className='text-lg font-bold theme-text-primary'>
                  {formatPrice(tokenData.price)}
                </div>
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isPositive ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className='w-3 h-3' />
                  ) : (
                    <TrendingDown className='w-3 h-3' />
                  )}
                  <span className='font-semibold'>
                    {isPositive ? '+' : ''}
                    {tokenData.change}%
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className='space-y-1'>
                {formatNumber(tokenData.marketCap) && (
                  <div className='flex justify-between items-center py-0.5'>
                    <span className='text-xs theme-text-secondary'>
                      {t('tradingPanel.marketCap')}
                    </span>
                    <span className='text-xs font-semibold theme-text-primary'>
                      ${formatNumber(tokenData.marketCap)}
                    </span>
                  </div>
                )}
                {formatNumber(tokenData.liquidity) && (
                  <div className='flex justify-between items-center py-0.5'>
                    <span className='text-xs theme-text-secondary'>
                      {t('tradingPanel.liquidity')}
                    </span>
                    <span className='text-xs font-semibold theme-text-primary'>
                      ${formatNumber(tokenData.liquidity)}
                    </span>
                  </div>
                )}
                {formatNumber(tokenData.holders) && (
                  <div className='flex justify-between items-center py-0.5'>
                    <span className='text-xs theme-text-secondary'>
                      {t('tradingPanel.holders')}
                    </span>
                    <span className='text-xs font-semibold theme-text-primary'>
                      {formatNumber(tokenData.holders)}
                    </span>
                  </div>
                )}
                <div className='flex justify-between items-center py-0.5'>
                  <span className='text-xs theme-text-secondary'>Chain</span>
                  <span className='text-xs font-semibold theme-text-primary'>
                    Solana
                  </span>
                </div>
              </div>

              {/* Contract Address */}
              <div className='mt-2 pt-1.5 border-t theme-border'>
                <div className='flex items-center justify-between mb-0.5'>
                  <span className='text-xs theme-text-secondary'>
                    {t('tradingPanel.contract')}
                  </span>
                  <a
                    href={tokenData.explorerUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='p-0.5 theme-hover rounded transition-all duration-200'
                  >
                    <ExternalLink className='w-3 h-3 theme-text-secondary' />
                  </a>
                </div>
                <div className='text-xs theme-text-primary font-mono break-all'>
                  {tokenData.tokenContractAddress.slice(0, 8)}...
                  {tokenData.tokenContractAddress.slice(-8)}
                </div>
              </div>
            </div>

            {/* Right - Swap */}
            <div className='theme-bg-primary rounded-lg p-2.5 theme-border'>
              {/* Selling Section - SOL */}
              <div className='relative theme-bg-secondary rounded-lg px-2 py-3 mb-1.5 theme-border'>
                <div className='absolute top-1 left-1.5 text-xs theme-text-secondary font-medium'>
                  {t('tradingPanel.from')}
                </div>
                <div className='flex items-center justify-between mt-2'>
                  <div className='flex items-center gap-1.5'>
                    <div className='relative'>
                      <img
                        src='https://pbs.twimg.com/profile_images/1979188777214943233/g5vg6s6U_400x400.jpg'
                        alt='SOL'
                        className='w-6 h-6 rounded-full shadow-lg'
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik02IDJMODUgNkg2LjVWNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02IDEwTDQuNSA4SDcuNUw2IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==';
                        }}
                      />
                    </div>
                    <div>
                      <div className='theme-text-primary font-semibold text-xs'>
                        SOL
                      </div>
                      <div className='theme-text-secondary text-xs'>Solana</div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <input
                      value={solAmount}
                      onChange={handleSolAmountChange}
                      placeholder='0.00'
                      className='bg-transparent theme-text-primary text-sm font-semibold text-right placeholder-theme-text-secondary focus:outline-none w-16'
                    />
                    <div className='theme-text-secondary text-xs'>
                      {walletConnected ? (
                        isLoadingBalance ? (
                          <span className='animate-pulse'>Loading...</span>
                        ) : (
                          `${solBalance} SOL`
                        )
                      ) : (
                        '$0.00'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Buying Section - Current Token */}
              <div className='relative theme-bg-secondary rounded-lg px-2 py-3 mb-2 theme-border'>
                <div className='absolute top-1 left-1.5 text-xs theme-text-secondary font-medium'>
                  {t('tradingPanel.to')}
                </div>
                <div className='flex items-center justify-between mt-2'>
                  <div className='flex items-center gap-1.5'>
                    <div className='relative'>
                      <img
                        src={tokenData.tokenLogoUrl}
                        alt={tokenData.tokenSymbol}
                        className='w-6 h-6 rounded-full shadow-lg'
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik02IDJMODUgNkg2LjVWNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02IDEwTDQuNSA4SDcuNUw2IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==';
                        }}
                      />
                    </div>
                    <div>
                      <div className='theme-text-primary font-semibold text-xs'>
                        {tokenData.tokenSymbol}
                      </div>
                      <div className='theme-text-secondary text-xs'>
                        {tokenData.tokenName}
                      </div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='theme-text-primary text-sm font-semibold'>
                      {estimatedTokenAmount}
                    </div>
                    <div className='theme-text-secondary text-xs'>
                      {estimatedTokenAmount !== '0.00'
                        ? `~$${(
                            parseFloat(estimatedTokenAmount) *
                            parseFloat(tokenData.price)
                          ).toFixed(2)}`
                        : '$0.00'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connect Button / Wallet Info */}
              {!walletConnected ? (
                <button
                  onClick={connectPhantomWallet}
                  disabled={isConnecting}
                  className='w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {isConnecting
                    ? t('tradingPanel.connecting')
                    : t('tradingPanel.connectWallet')}
                </button>
              ) : (
                <div className='space-y-2'>
                  {/* Wallet Address */}
                  <div className='theme-bg-secondary rounded-lg p-2 theme-border'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-xs theme-text-secondary'>
                        {t('tradingPanel.wallet')}
                      </span>
                      <button
                        onClick={copyAddress}
                        className='p-0.5 theme-hover rounded transition-all duration-200'
                      >
                        <Copy className='w-3 h-3 theme-text-secondary' />
                      </button>
                    </div>
                    <div className='text-xs theme-text-primary font-mono break-all'>
                      {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                    </div>
                  </div>

                  {/* SOL Balance */}
                  <div className='theme-bg-secondary rounded-lg p-2 theme-border'>
                    <div className='flex items-center justify-between'>
                      <span className='text-xs theme-text-secondary'>
                        {t('tradingPanel.solBalance')}
                      </span>
                      <div className='flex items-center gap-1'>
                        {isLoadingBalance ? (
                          <span className='text-xs font-semibold theme-text-primary animate-pulse'>
                            {t('tradingPanel.loading')}
                          </span>
                        ) : (
                          <span className='text-xs font-semibold theme-text-primary'>
                            {solBalance} SOL
                          </span>
                        )}
                        <button
                          onClick={refreshBalance}
                          disabled={isLoadingBalance}
                          className='p-0.5 theme-hover rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                          title={t('tradingPanel.refreshBalance')}
                        >
                          <RefreshCw
                            className={`w-3 h-3 theme-text-secondary ${
                              isLoadingBalance ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Swap Status */}
                  {swapStatus && (
                    <div
                      className={`theme-bg-secondary rounded-lg p-2 theme-border text-center ${
                        swapStatusType === 'success'
                          ? 'text-green-500'
                          : swapStatusType === 'error'
                          ? 'text-red-500'
                          : 'theme-text-primary'
                      }`}
                    >
                      <span className='text-xs font-medium'>{swapStatus}</span>
                    </div>
                  )}

                  {/* Swap Button */}
                  <button
                    onClick={fetchSwapInstruction}
                    disabled={
                      isSwapping || !solAmount || parseFloat(solAmount) <= 0
                    }
                    className='w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {isSwapping
                      ? t('tradingPanel.swapping')
                      : t('tradingPanel.swap')}
                  </button>

                  {/* Disconnect Button */}
                  <button
                    onClick={disconnectWallet}
                    className='w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm flex items-center justify-center gap-1'
                  >
                    <LogOut className='w-3 h-3' />
                    {t('tradingPanel.disconnect')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          {swapHistory?.length > 0 && (
            <div className='theme-bg-primary rounded-lg p-2.5 theme-border'>
              <div className='flex items-center gap-2 mb-2'>
                <Clock className='w-4 h-4 theme-text-secondary' />
                <h3 className='text-sm font-semibold theme-text-primary'>
                  {t('tradingPanel.recentTransactions')}
                </h3>
              </div>
              <div className='space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar'>
                {swapHistory.slice(0, 2).map((swap) => (
                  <div
                    key={swap.id}
                    className='theme-bg-secondary rounded-lg p-2 theme-border hover:theme-hover transition-all duration-200'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      {/* Left: Swap Info */}
                      <div className='flex items-center gap-2 flex-1 min-w-0'>
                        {/* SOL Icon */}
                        <img
                          src='https://pbs.twimg.com/profile_images/1979188777214943233/g5vg6s6U_400x400.jpg'
                          alt='SOL'
                          className='w-5 h-5 rounded-full flex-shrink-0'
                        />
                        {/* Arrow */}
                        <ArrowRight className='w-3 h-3 theme-text-secondary flex-shrink-0' />
                        {/* Token Icon */}
                        <img
                          src={swap.toTokenLogo}
                          alt={swap.toTokenSymbol}
                          className='w-5 h-5 rounded-full flex-shrink-0'
                          onError={(e) => {
                            e.currentTarget.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik02IDJMODUgNkg2LjVWNloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik02IDEwTDQuNSA4SDcuNUw2IDEwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==';
                          }}
                        />
                        {/* Amounts */}
                        <div className='flex-1 min-w-0'>
                          <div className='text-xs theme-text-primary font-medium truncate'>
                            {formatSwapAmount(swap.fromAmount)} SOL →{' '}
                            {/* {formatSwapAmount(swap.estimatedAmount)}{' '} */}
                            {swap.toTokenSymbol}
                          </div>
                          <div className='text-xs theme-text-secondary'>
                            {formatTime(swap.timestamp)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status & Link */}
                      <div className='flex items-center gap-1.5 flex-shrink-0'>
                        {swap.status === 'success' && (
                          <CheckCircle2 className='w-3.5 h-3.5 text-green-500' />
                        )}
                        <a
                          href={`https://explorer.solana.com/tx/${swap.signature}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='p-1 theme-hover rounded transition-all duration-200'
                          title={t('tradingPanel.viewOnSolscan')}
                        >
                          <ExternalLink className='w-3.5 h-3.5 theme-text-secondary hover:theme-text-primary' />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
