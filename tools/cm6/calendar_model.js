const pad=(value,size=2)=>String(value).padStart(size,'0');
export function leapYear(year){return year%4===0&&(year%100!==0||year%400===0);}
export function daysInMonth(year,month){
 if(!Number.isInteger(year)||year<0||year>9999||!Number.isInteger(month)||month<1||month>12)throw new Error('Некорректный месяц.');
 return [31,leapYear(year)?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
export function parseDate(value){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
 if(!m)throw new Error('Дата: YYYY-MM-DD.');
 const year=+m[1],month=+m[2],day=+m[3];
 if(day<1||day>daysInMonth(year,month))throw new Error('Такой даты нет в календаре.');
 return {year,month,day};
}
export function dateISO({year,month,day}){daysInMonth(year,month);if(!Number.isInteger(day)||day<1||day>daysInMonth(year,month))throw new Error('Некорректный день.');return pad(year,4)+'-'+pad(month)+'-'+pad(day);}
function utcDate(value){const p=parseDate(value),d=new Date(0);d.setUTCHours(0,0,0,0);d.setUTCFullYear(p.year,p.month-1,p.day);return d;}
export function addDays(value,delta){const d=utcDate(value);d.setUTCDate(d.getUTCDate()+delta);const year=d.getUTCFullYear();return year<0||year>9999?null:dateISO({year,month:d.getUTCMonth()+1,day:d.getUTCDate()});}
export function shiftMonth(value,delta){const p=parseDate(value),total=p.year*12+p.month-1+delta;if(total<0||total>=120000)return null;const year=Math.floor(total/12),month=total%12+1;return dateISO({year,month,day:Math.min(p.day,daysInMonth(year,month))});}
export function monthGrid(value){const p=parseDate(value),first=dateISO({...p,day:1}),offset=(utcDate(first).getUTCDay()+6)%7;return Array.from({length:42},(_,i)=>addDays(first,i-offset));}
export function parseCalendarValue(value,kind){
 if(kind==='date'){parseDate(value);return {date:value,hour:0,minute:0,second:0,seconds:false};}
 if(kind!=='datetime')throw new Error('Неизвестный вид календаря.');
 const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value));
 if(!m)throw new Error('Дата/время: YYYY-MM-DDTHH:mm[:ss].');
 parseDate(m[1]);
 if(+m[2]>23||+m[3]>59||+(m[4]||0)>59)throw new Error('Некорректное время.');
 return {date:m[1],hour:+m[2],minute:+m[3],second:+(m[4]||0),seconds:m[4]!==undefined};
}
export function composeCalendarValue(date,kind,hour='0',minute='0',second='0',seconds=false){
 parseDate(date);if(kind==='date')return date;
 const part=(value,max)=>{const s=String(value);if(!/^\d{1,2}$/.test(s)||+s>max)throw new Error('Заполните время корректно.');return pad(+s);};
 const value=date+'T'+part(hour,23)+':'+part(minute,59)+(seconds?':'+part(second,59):'');
 parseCalendarValue(value,kind);return value;
}
export function localNow(date=new Date()){return {date:dateISO({year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate()}),hour:date.getHours(),minute:date.getMinutes(),second:date.getSeconds(),seconds:true};}
