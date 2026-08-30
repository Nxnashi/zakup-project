// Бэкенд отдаёт время в UTC без явной пометки зоны (например
// "2026-08-30T15:10:31"). Без "Z" в конце браузер интерпретирует такую
// строку как уже местное время устройства, без сдвига — из-за этого часы
// «плыли». Здесь досдаём "Z", если её нет, и всегда форматируем именно по
// Ташкенту, а не по таймзоне телефона (она может быть настроена неверно).

function toUtcIso(iso) {
  if (!iso) return iso;
  return /[Zz]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`;
}

export function formatDateTime(iso) {
  return new Date(toUtcIso(iso)).toLocaleString("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso) {
  return new Date(toUtcIso(iso)).toLocaleDateString("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
