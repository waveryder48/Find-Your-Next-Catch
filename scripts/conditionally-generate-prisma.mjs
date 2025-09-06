// Skip prisma generate when building the mock-only prototype
const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
if (isMock) {
    console.log('🟡 Mock mode detected — skipping `prisma generate`.');
    process.exit(0);
}

// Otherwise, run prisma generate normally
import { spawnSync } from 'node:child_process';
const result = spawnSync('npx', ['prisma', 'generate'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
