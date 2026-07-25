import { useState, useEffect } from "react";
import { 
  Layers, Shield, Cpu, RefreshCw, Key, Database, Search, ArrowRight,
  TrendingUp, CheckCircle, AlertTriangle, CloudRain, Coins, ExternalLink
} from "lucide-react";
import { BlockchainBlock } from "../types";

interface AdminDashboardProps {
  blocks: BlockchainBlock[];
  stats: {
    totalClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    pendingClaims: number;
    totalDisbursedInr: number;
    totalSecuredBlocks: number;
    weatherVerifiedPercentage: number;
  };
  refreshBlocks: () => void;
}

export default function AdminDashboard({
  blocks,
  stats,
  refreshBlocks,
}: AdminDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<BlockchainBlock | null>(null);

  useEffect(() => {
    refreshBlocks();
  }, []);

  const filteredBlocks = blocks.filter(
    (b) =>
      b.claimId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.currentHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.officerWallet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. BENTO STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-sm border border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100">Nyay Disbursed</span>
            <Coins className="w-5 h-5 text-blue-200" />
          </div>
          <p className="text-2xl font-extrabold font-mono mt-2">₹{stats.totalDisbursedInr.toLocaleString()}</p>
          <div className="text-[10px] text-blue-100/90 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Guaranteed direct transfer payout</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secured Blocks</span>
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono mt-2 text-slate-800">{stats.totalSecuredBlocks}</p>
          <p className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>On-chain immutability achieved</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Meteorology Matches</span>
            <CloudRain className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono mt-2 text-slate-800">{stats.weatherVerifiedPercentage}%</p>
          <p className="text-[10px] text-blue-600 font-semibold mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Verified by AWS weather grid</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Claims Ratio</span>
            <Cpu className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono mt-2 text-slate-800">
            {stats.approvedClaims} <span className="text-xs font-normal text-slate-400">vs</span> {stats.rejectedClaims}
          </p>
          <p className="text-[10px] text-slate-500 mt-2">
            Pending Officer: <span className="font-bold text-blue-600">{stats.pendingClaims}</span>
          </p>
        </div>
      </div>

      {/* 2. CHALIN LEDGER EXPLORER CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-5 h-5 text-blue-600" />
                Kisan Nyay Blockchain Ledger
              </h3>
              <p className="text-xs text-slate-500">Live blocks mined on claim resolutions by verified officers.</p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Claim or Hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="space-y-4">
            {filteredBlocks.map((block) => {
              const isSelected = selectedBlock?.blockNumber === block.blockNumber;
              return (
                <div
                  key={block.blockNumber}
                  onClick={() => setSelectedBlock(block)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? "border-blue-600 bg-blue-50/10 shadow-sm"
                      : "border-slate-150 bg-slate-50/40 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 text-white rounded-lg p-2.5 flex flex-col items-center justify-center font-mono shrink-0">
                        <span className="text-[9px] uppercase font-bold text-blue-100">Block</span>
                        <span className="text-sm font-extrabold leading-none mt-0.5">#{block.blockNumber}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">Claim: {block.claimId}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                            (block.status as string) === "Genesis"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : block.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-100"
                          }`}>
                            {block.status}
                          </span>
                          {block.network && (
                            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-indigo-700">
                              {block.simulated ? "Simulator" : "Sepolia"}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-1">
                          Hash: {block.currentHash}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-mono text-slate-500">
                        {block.simulated === false ? `Sepolia block #${block.blockNumber}` : `Nonce: ${block.nonce}`}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">{new Date(block.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. DETAILED BLOCK INSPECTOR SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          {selectedBlock ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 font-mono text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-blue-600 font-bold text-xs flex items-center gap-1.5">
                  <Key className="w-4 h-4" />
                  Block #{selectedBlock.blockNumber} Details
                </span>
                <span className="text-[10px] text-slate-400">Mined Proof</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Claim Identifier</span>
                  <p className="text-slate-800 font-bold">{selectedBlock.claimId}</p>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Ledger Network</span>
                  <p className="text-slate-700">
                    {selectedBlock.simulated === false ? "Ethereum Sepolia" : "Local proof-of-work simulator"}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Sealing Officer Wallet</span>
                  <p className="text-slate-700 break-all bg-slate-50 p-1.5 rounded border border-slate-150 mt-0.5 text-[10px]">
                    {selectedBlock.officerWallet}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Evidence Payload SHA-256 Hash</span>
                  <p className="text-slate-700 break-all bg-slate-50 p-1.5 rounded border border-slate-150 mt-0.5 text-[10px]">
                    {selectedBlock.evidenceHash}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 uppercase block">Previous Block Hash</span>
                  <p className="text-slate-500 break-all bg-slate-50 p-1.5 rounded border border-slate-150 mt-0.5 text-[10px]">
                    {selectedBlock.previousHash}
                  </p>
                </div>

                <div>
                  <span className="text-[9px] text-blue-600 uppercase block font-bold">Current Block Hash</span>
                  {selectedBlock.explorerUrl ? (
                    <a
                      href={selectedBlock.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 flex items-start gap-1 rounded border border-blue-200/50 bg-blue-50/50 p-1.5 text-[10px] font-semibold text-blue-700 hover:underline"
                    >
                      <span className="break-all">{selectedBlock.currentHash}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-blue-700 break-all bg-blue-50/50 p-1.5 rounded border border-blue-200/50 mt-0.5 text-[10px] font-semibold">
                      {selectedBlock.currentHash}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[9px] text-slate-400 leading-normal border-t border-slate-100 pt-3">
                This block is chained chronologically. Modifying this block would break the hash cascade of all subsequent blocks, ensuring complete audit immutability.
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center text-slate-400 py-16 flex flex-col items-center justify-center h-full min-h-[300px]">
              <Layers className="w-10 h-10 text-slate-300 mb-3 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-800">Select Block to Inspect</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Click on any block in the ledger to view the cryptographic links, previous hash pointers, and officer signatures.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
