import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Connection } from '../store/connectionStore';

interface Props {
  initial?: Connection;
  onSubmit: (connection: Connection) => void;
  onTest?: (connection: Connection) => Promise<{ success: boolean; error?: string }>;
  onCancel?: () => void;
}

export function ConnectionForm({ initial, onSubmit, onTest, onCancel }: Props) {
  const [form, setForm] = useState<Connection>(
    initial || { name: '', endpoint: '', accessKey: '', secretKey: '', useTLS: false }
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    setTestResult(null);
    console.log('handleTest form:', JSON.stringify(form));

    // First test raw HTTP
    try {
      const protocol = form.useTLS ? 'https' : 'http';
      const endpoint = form.endpoint.startsWith('http') ? form.endpoint : `${protocol}://${form.endpoint}`;
      const debugResult = await invoke<string>('debug_http', { endpoint });
      console.log('debug_http result:', debugResult);
    } catch (e) {
      console.log('debug_http error:', e);
    }

    try {
      const result = await onTest(form);
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, error: String(e) });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">连接名称</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="My S3"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="useTLS"
          checked={form.useTLS}
          onChange={(e) => setForm({ ...form, useTLS: e.target.checked })}
        />
        <label htmlFor="useTLS" className="text-sm">使用 TLS (HTTPS)</label>
      </div>
      <div>
        <label className="block text-sm font-medium">Endpoint</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={form.endpoint}
          onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
          placeholder="18.1.239.163:8082"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Access Key</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={form.accessKey}
          onChange={(e) => setForm({ ...form, accessKey: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Secret Key</label>
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          value={form.secretKey}
          onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        {onTest && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? '测试中...' : '测试连接'}
          </button>
        )}
        <button
          onClick={() => onSubmit(form)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          保存
        </button>
        {onCancel && (
          <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
            取消
          </button>
        )}
      </div>
      {testResult?.success && <p className="text-green-600">连接成功</p>}
      {testResult && !testResult.success && (
        <p className="text-red-600">连接失败: {testResult.error}</p>
      )}
    </div>
  );
}