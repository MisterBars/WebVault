export const PROPERTY_VALUE_LIMITS = Object.freeze({perNote:1000, valueLength:1024, menu:20});
export function collectPropertyValues(entries) {
  const result = [];
  let remaining = PROPERTY_VALUE_LIMITS.perNote;
  for (const entry of entries || []) {
    if (typeof entry.key !== 'string') continue;
    const source = Array.isArray(entry.value) ? entry.value : entry.type === 'text' ? [entry.value] : [];
    const values = [];
    for (const value of source) {
      if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value) || value.length > PROPERTY_VALUE_LIMITS.valueLength) continue;
      if (remaining <= 0) break;
      values.push(value);
      remaining--;
    }
    if (values.length) result.push([entry.key.toLowerCase(), [...new Set(values)]]);
    if (remaining <= 0) break;
  }
  return result;
}
export function propertyCandidates(notes, key, sourcePath) {
  const values = new Set();
  for (const note of notes || []) {
    if (note.path === sourcePath) continue;
    for (const [name, entries] of note.propertyValues || []) {
      if (name === key.toLowerCase()) for (const value of entries) values.add(value);
    }
  }
  return [...values].sort((a,b)=>a.localeCompare(b));
}
export function filterPropertyValues(pool, query, selected, limit=PROPERTY_VALUE_LIMITS.menu) {
  const chosen = new Set(selected);
  const needle = query.trim().toLowerCase();
  return [...new Set(pool)].filter(value => !chosen.has(value) && value.toLowerCase().includes(needle)).slice(0,limit);
}
