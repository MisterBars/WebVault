export function gutterShift({paneLeft,paneRight,border=0,inset=8,gutterLeft,gutterWidth,previousShift=0}){
 const values=[paneLeft,paneRight,border,inset,gutterLeft,gutterWidth,previousShift];
 if(values.some(v=>!Number.isFinite(v))||paneRight<=paneLeft||gutterWidth<=0)return null;
 const innerLeft=paneLeft+Math.max(0,border),available=paneRight-innerLeft;
 if(gutterWidth+2>available)return 0;
 const padding=Math.max(0,inset);
 const target=Math.max(innerLeft,Math.min(innerLeft+padding,paneRight-gutterWidth-2));
 const originalLeft=gutterLeft-previousShift;
 return Math.round((target-originalLeft)*100)/100;
}
