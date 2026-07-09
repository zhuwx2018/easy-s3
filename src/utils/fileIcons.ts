import { Image, Video, Music, FileText, Code, Archive, Settings, File, Folder } from 'lucide-react';
import type { ComponentType } from 'react';

const FILE_EXTENSIONS: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
  video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf'],
  code: ['js', 'ts', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'css', 'html', 'json', 'xml', 'yaml', 'yml', 'toml', 'sh', 'bash', 'sql', 'vue', 'jsx', 'tsx'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
  config: ['env', 'ini', 'conf', 'cfg', 'properties'],
};

export function getFileIcon(key: string, isFolder: boolean): ComponentType<any> {
  if (isFolder) return Folder;

  const ext = key.split('.').pop()?.toLowerCase() || '';

  if (FILE_EXTENSIONS.image.includes(ext)) return Image;
  if (FILE_EXTENSIONS.video.includes(ext)) return Video;
  if (FILE_EXTENSIONS.audio.includes(ext)) return Music;
  if (FILE_EXTENSIONS.document.includes(ext)) return FileText;
  if (FILE_EXTENSIONS.code.includes(ext)) return Code;
  if (FILE_EXTENSIONS.archive.includes(ext)) return Archive;
  if (FILE_EXTENSIONS.config.includes(ext)) return Settings;

  return File;
}
