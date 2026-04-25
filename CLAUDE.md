# Agent Echo

## 项目规范

### 导入规范

**不要在导入时使用 `.js` 后缀**

ESM 项目中，bundler (Vite/electron-vite) 会自动解析文件扩展名，源码中不需要写 `.js` 后缀。

```typescript
// 正确
import { BridgeServer } from './bridge/server';

// 错误
import { BridgeServer } from './bridge/server.js';
```

### Electron 开发

- 使用 `pnpm dev` 启动开发模式
- 构建: `pnpm build`
