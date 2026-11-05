import React, { useState } from 'react';
import {
  Cloud,
  Laptop,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  ConnectedDeviceMetadata,
  SyncConnectionStatus,
  getDefaultDeviceName,
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
  userEmail,
  lastSyncedDevice,
  lastSyncedAt,
  connectedDevices,
  onGoogleSignIn,
  onLogoutAccount,
  onForceSyncNow,
}) => {
  const isEn = lang === 'en';
  const [deviceNameInput, setDeviceNameInput] = useState<string>(getDefaultDeviceName());

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
                    ? 'Multi-Device Gmail Cloud Sync'
                    : 'Đồng Bộ Đa Thiết Bị Qua Gmail (DeskAura Cloud)'}
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
                    ? 'Local Mode (Not Signed In)'
                    : 'Chế độ cục bộ (Chưa đăng nhập Gmail)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEn
                  ? 'Sign in with your Gmail account to automatically sync water intake, 7-day analytics, and settings across MacBook & Windows PC'
                  : 'Đăng nhập bằng Gmail để tự động đồng bộ lượng nước uống, biểu đồ 7 ngày và cài đặt giữa MacBook & PC Windows'}
              </p>
            </div>
          </div>
        </div>

        {userEmail && (
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

      {/* Main Content: Left 7 Cols (Gmail Login / Active Account) & Right 5 Cols (Hardware Device Tracking) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Gmail Authentication */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          {userEmail ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-sky-50/50 border border-emerald-200/80 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                    <MailCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">
                        {isEn ? 'Synced Gmail Account:' : 'Tài khoản Gmail đang đồng bộ:'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {isEn ? '✓ Verified by Google' : '✓ Xác thực bởi Google'}
                      </span>
                    </div>
                    <p className="text-base font-extrabold text-emerald-950 mt-0.5">
                      {userEmail}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogoutAccount}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 transition shadow-2xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {isEn ? 'Sign Out / Switch Gmail' : 'Đăng xuất / Đổi Gmail'}
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {isEn
                  ? 'All computers signed into this Gmail account share the same wellness profile automatically. Signing out on a computer cleanly removes that device from this Gmail profile.'
                  : 'Mọi máy tính đăng nhập cùng địa chỉ Gmail này sẽ tự động dùng chung hồ sơ sức khỏe. Khi một máy bấm Đăng xuất, thiết bị đó sẽ tự động được gỡ khỏi danh sách kết nối của Gmail này.'}
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200/80 space-y-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full">
                  {isEn
                    ? '✨ No Account Creation or Password Required'
                    : '✨ Không Cần Tạo Tài Khoản Hay Đặt Mật Khẩu Mới'}
                </span>
                <h3 className="text-sm font-extrabold text-slate-800 pt-1">
                  {isEn
                    ? 'One-Click Sign In with Your Google (Gmail) Account'
                    : 'Đăng Nhập 1-Chạm Bằng Tài Khoản Google (Gmail)'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isEn
                    ? 'Simply select your existing Gmail account. Your Gmail address becomes your unique sync ID across all your MacBooks and Windows PCs.'
                    : 'Chỉ cần chọn tài khoản Gmail có sẵn của bạn. Địa chỉ Gmail sẽ làm mã đồng bộ duy nhất giữa các máy MacBook và PC Windows của bạn.'}
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-5 py-3 rounded-2xl text-xs font-extrabold bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-emerald-400 shadow-sm transition cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>
                    {isEn
                      ? 'Sign in with Google (Gmail)'
                      : 'Đăng nhập bằng Google (Gmail)'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Hardware Device Identity & Connected Devices List */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between space-y-3">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-emerald-600" />
                {isEn ? 'This Device Name:' : 'Tên thiết bị hiện tại:'}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                {userEmail
                  ? isEn
                    ? `${deviceCount} device(s) linked`
                    : `${deviceCount} thiết bị đang kết nối`
                  : isEn
                  ? '1 local device'
                  : '1 thiết bị cục bộ'}
              </span>
            </div>
            <input
              type="text"
              value={deviceNameInput}
              onChange={(e) => {
                setDeviceNameInput(e.target.value);
                setDeviceName(e.target.value);
              }}
              placeholder="MacBook Pro / Windows PC"
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-emerald-400"
            />

            {/* Connected Devices Pills */}
            {userEmail && connectedDevices.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                  {isEn
                    ? 'Devices linked to this Gmail:'
                    : 'Các thiết bị đang dùng Gmail này:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
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
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>{isEn ? 'Gmail Sync ID:' : 'Mã đồng bộ (Gmail):'}</span>
              <span className="font-extrabold text-emerald-700 truncate max-w-[180px]">
                {userEmail || (isEn ? 'Not signed in' : 'Chưa đăng nhập')}
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
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex items-center gap-2 text-[11px] text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isEn
                ? 'Hardware ID deduplication keeps device count 100% accurate across reinstalls.'
                : 'Định danh phần cứng (Hardware ID) giúp đếm chuẩn số máy, cài lại app không bị trùng.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
