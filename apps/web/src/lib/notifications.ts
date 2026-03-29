export function generateDauNotificationHtml(dau: number, date: string): string {
  return `<h2>Phase 1 Validation Gate Passed</h2>
<p>Scrave has reached <strong>${dau} daily active users</strong> today (${date}).</p>
<p>Time to move to Phase 2 growth features.</p>`;
}
