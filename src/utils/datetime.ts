/**
 * 后端 `Date` 直接序列化为毫秒时间戳，前端统一在这里转本地时间。
 *
 * @param ts 毫秒时间戳；null/undefined/0 视为无值
 * @returns 形如 2026/11/18 11:30:00；无值时返回「—」
 */
export function formatTime(ts: number | null | undefined): string {
	if (!ts) return '—'
	return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}
