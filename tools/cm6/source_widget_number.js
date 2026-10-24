export function widgetSourceNumber(block,number){if(block?.synthetic)return null;return block?.tokens?.[0]?.type==='hr'?'':number;}
