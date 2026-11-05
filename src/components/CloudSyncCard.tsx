import React, { useState } from 'react';
import {
  Check,
  Cloud,
  CloudOff,
  Copy,
  Laptop,
  Link2,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from 'lucide-react';
import {
  ConnectedDeviceMetadata,
  SyncConnectionStatus,
  generateAuraSyncCode,
  getDefaultDeviceName,
  normalizeSyncCode,
  setDeviceName,
} from '../services/firebaseSync';

interface CloudSyncCardProps {
  lang?: 'vi' | 'en';
  syncStatus: SyncConnectionStatus;
  syncError: string | null;
  activeSyncCode: string;
  userEmail: string | null;
  lastSyncedDevice: string | null;
  lastSyncedAt: number | null;
  connectedDevices: ConnectedDeviceMetadata[];
  onConnectSyncCode: (code: string) => void;
  onDisconnectSync: () => void;
  onGoogleSignIn: () => void;
  onEmailAuth: (email: string, pass: string, isRegister: boolean) => void;
  onLogoutAccount: () => void;
  onForceSyncNow: () => void;
}

export const CloudSyncCard: React.FC<CloudSyncCardProps> = ({
  lang = 'vi',
  syncStatus,
  syncError,
  activeSyncCode,
  userEmail,
  lastSyncedDevice,
  lastSyncedAt,
  connectedDevices,
  onConnectSyncCode,
  onDisconnectSync,
  onGoogleSignIn,
  onEmailAuth,
  onLogoutAccount,
  onForceSyncNow,
}) => {
  const isEn = lang === 'en';
  const [deviceNameInput, setDeviceNameInput] = useState<string>(getDefaultDeviceName());
  const [syncCodeInput, setSyncCodeInput] = useState<string>(activeSyncCode || '');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Email/Password Auth State
  const [authTab, setAuthTab] = useState<'code' | 'account'>('code');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);

  const handleCopySyncCode = () => {
    const codeToCopy = activeSyncCode || syncCodeInput;
    if (!codeToCopy) return;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleGenerateNewCode = () => {
    const newCode = generateAuraSyncCode();
    setSyncCodeInput(newCode);
    onConnectSyncCode(newCode);
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return isEn ? 'Not synced yet' : 'Chưa đồng bộ';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(
      2,
      '0'
    )}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const deviceCount = Math.max(1, connectedDevices.length);

  return (
    <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-sm space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">
                  {isEn
                    ? 'Multi-Device Cloud Sync (DeskAura Cloud)'
                    : 'Đồng Bộ Đa Thiết Bị (DeskAura Cloud)'}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-100 text-emerald-800'
                      : syncStatus === 'offline_cached'
                      ? 'bg-amber-100 text-amber-800'
                      : syncStatus === 'connecting'
                      ? 'bg-sky-100 text-sky-800'
                      : syncStatus === 'error'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      syncStatus === 'synced'
                        ? 'bg-emerald-500 animate-pulse'
                        : syncStatus === 'offline_cached'
                        ? 'bg-amber-500'
                        : syncStatus === 'connecting'
                        ? 'bg-sky-500 animate-ping'
                        : syncStatus === 'error'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  {syncStatus === 'synced'
                    ? isEn
                      ? 'Live Synced'
                      : 'Đang đồng bộ trực tuyến'
                    : syncStatus === 'offline_cached'
                    ? isEn
                      ? 'Offline Cache Ready'
                      : 'Lưu đệm Offline (Tự đồng bộ khi có mạng)'
                    : syncStatus === 'connecting'
                    ? isEn
                      ? 'Connecting...'
                      : 'Đang kết nối...'
                    : syncStatus === 'error'
                    ? isEn
                      ? 'Sync Alert'
                      : 'Cần kiểm tra kết nối'
                    : isEn
                    ? 'Local Mode'
                    : 'Chế độ cục bộ (Chưa bật Cloud)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEn
                  ? 'Seamlessly sync water intake, 7-day Mebius analytics, habit streaks, and settings across Windows, MacBook & iPhone'
                  : 'Đồng bộ tức thì lượng nước uống, biểu đồ Mebius 7 ngày, chuỗi Streak và cài đặt giữa PC Windows, MacBook & iPhone'}
              </p>
            </div>
          </div>
        </div>

        {(activeSyncCode || userEmail) && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onForceSyncNow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isEn ? 'Sync Now' : 'Đồng bộ ngay'}
            </button>
          </div>
        )}
      </div>

      {syncError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-3">
          <span>
            <strong>{isEn ? 'Sync Note:' : 'Lưu ý kết nối:'}</strong> {syncError}
          </span>
        </div>
      )}

      {/* Mode Switcher Tabs: 1. Aura Sync Code (6 chars) vs 2. Account Login (Email / Google) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Pairing Method */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setAuthTab('code')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                authTab === 'code'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              {isEn ? '1. Quick Sync Code (Aura Code)' : '1. Mã Đồng Bộ Nhanh (Aura Code)'}
            </button>
            <button
              type="button"
              onClick={() => setAuthTab('account')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                authTab === 'account'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              {isEn ? '2. Google / Email Account' : '2. Tài Khoản Google / Email'}
            </button>
          </div>

          {authTab === 'code' ? (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950">
                  {isEn
                    ? '🔑 Pair Windows PC, MacBook & iPhone via Aura Sync Code'
                    : '🔑 Ghép Đôi Nhanh PC Windows, MacBook & iPhone Bằng Mã 6 Ký Tự'}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateNewCode}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                >
                  {isEn ? '+ Generate New Code' : '+ Tạo mã mới tự động'}
                </button>
              </div>
              <p className="text-xs text-slate-600">
                {isEn
                  ? 'Enter the same Aura Code on your MacBook, Windows PC, or iPhone to link them in real time without browser popups.'
                  : 'Nhập cùng một mã Aura Code này trên MacBook, PC Windows hoặc iPhone để liên kết dữ liệu tức thì mà không cần mở trình duyệt.'}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={syncCodeInput}
                  onChange={(e) => setSyncCodeInput(e.target.value.toUpperCase())}
                  placeholder="AURA-892145"
                  className="flex-1 min-w-[160px] px-3.5 py-2.5 rounded-xl text-sm font-extrabold tracking-widest uppercase bg-white border border-emerald-300 text-emerald-900 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    onConnectSyncCode(normalizeSyncCode(syncCodeInput))
                  }
                  disabled={!syncCodeInput.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                >
                  {activeSyncCode &&
                  normalizeSyncCode(syncCodeInput) === activeSyncCode
                    ? isEn
                      ? '✓ Connected'
                      : '✓ Đang kết nối mã này'
                    : isEn
                    ? 'Link Device'
                    : 'Kết nối mã này'}
                </button>
                {(activeSyncCode || syncCodeInput) && (
                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                    title={isEn ? 'Copy Sync Code' : 'Sao chép mã'}
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
                {activeSyncCode && (
                  <button
                    type="button"
                    onClick={onDisconnectSync}
                    className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition"
                    title={isEn ? 'Disconnect Sync Code' : 'Ngắt kết nối mã'}
                  >
                    <CloudOff className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200/70 space-y-3">
              {userEmail ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {isEn ? 'Signed in as:' : 'Đang đăng nhập tài khoản:'}
                    </p>
                    <p className="text-sm font-extrabold text-sky-700">
                      {userEmail}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogoutAccount}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {isEn ? 'Sign Out' : 'Đăng xuất'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      {isEn
                        ? 'Sign in with Email or Google Account'
                        : 'Đăng nhập bằng Email hoặc Tài khoản Google'}
                    </span>
                    <button
                      type="button"
                      onClick={onGoogleSignIn}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm transition"
                    >
                      <LogIn className="w-3.5 h-3.5 text-sky-600" />
                      {isEn ? 'Sign in with Google' : 'Đăng nhập Google'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={isEn ? 'Email address...' : 'Nhập địa chỉ Email...'}
                      className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:border-sky-400"
                    />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={
                        isEn ? 'Password (min 6 chars)...' : 'Mật khẩu (tối thiểu 6 ký tự)...'
                      }
                      className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode((prev) => !prev)}
                      className="text-xs font-semibold text-sky-700 hover:underline"
                    >
                      {isRegisterMode
                        ? isEn
                          ? 'Already have an account? Sign In'
                          : 'Đã có tài khoản? Chuyển sang Đăng nhập'
                        : isEn
                        ? 'New user? Create an account'
                        : 'Chưa có tài khoản? Tạo tài khoản mới'}
                    </button>
                    <button
                      type="button"
                      disabled={!emailInput.trim() || passwordInput.length < 6}
                      onClick={() =>
                        onEmailAuth(emailInput, passwordInput, isRegisterMode)
                      }
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition disabled:opacity-50"
                    >
                      {isRegisterMode
                        ? isEn
                          ? 'Create Account'
                          : 'Đăng ký & Đồng bộ'
                        : isEn
                        ? 'Sign In'
                        : 'Đăng nhập'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Device Name & Live Connected Devices List */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-emerald-600" />
                {isEn ? 'This Device Name:' : 'Tên thiết bị hiện tại:'}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                {activeSyncCode || userEmail
                  ? isEn
                    ? `${deviceCount} device(s) linked`
                    : `${deviceCount} thiết bị đang kết nối`
                  : 'Windows • macOS • iOS'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deviceNameInput}
                onChange={(e) => {
                  setDeviceNameInput(e.target.value);
                  setDeviceName(e.target.value);
                }}
                className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/70 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>{isEn ? 'Active Sync Room:' : 'Mã phòng đồng bộ:'}</span>
              <span className="font-extrabold text-emerald-700">
                {activeSyncCode || (userEmail ? 'Account Cloud' : 'Local Only')}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>{isEn ? 'Last updated by:' : 'Cập nhật gần nhất từ:'}</span>
              <span className="font-bold text-slate-800">
                {lastSyncedDevice || deviceNameInput}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>{isEn ? 'Last sync time:' : 'Thời điểm đồng bộ:'}</span>
              <span className="font-semibold text-slate-700">
                {formatTime(lastSyncedAt)}
              </span>
            </div>

            {connectedDevices.length > 0 && (
              <div className="pt-1.5 flex flex-wrap gap-1.5">
                {connectedDevices.map((dev) => (
                  <span
                    key={dev.uid}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {dev.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/90 px-3 py-1.5 rounded-xl border border-emerald-200/60">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {isEn
                ? 'Deduplicated Log Union protects water & standup history from conflicts.'
                : 'Thuật toán Hợp nhất Nhật ký chống ghi đè nước uống & số lần đứng dậy.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
