import { useState } from 'react';
import type { Connection } from '../store/connectionStore';

interface Props {
  initial?: Connection;
  onSubmit: (connection: Connection) => void;
  onTest?: (connection: Connection) => Promise<boolean>;
  onCancel?: () => void;
}

export function ConnectionForm({ initial, onSubmit, onTest, onCancel }: Props) {
  const [form, setForm] = useState<Connection>(
    initial || { name: '', endpoint: '', region: 'us-east-1', accessKey: '', secretKey: '' }
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    setTestResult(null);
    try {
      const success = await onTest(form);
      setTestResult(success ? 'success' : 'error');
    } catch {
      setTestResult('error');
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
      <div>
        <label className="block text-sm font-medium">Endpoint</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={form.endpoint}
          onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
          placeholder="https://s3.amazonaws.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Region</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          placeholder="us-east-1"
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
      {testResult === 'success' && <p className="text-green-600">连接成功</p>}
      {testResult === 'error' && <p className="text-red-600">连接失败</p>}
    </div>
  );
}