/* صف واحد موسع في كل مرة؛ تفاعل للمعاينة دون ربط بالبيانات الحية. */
const rows=[...document.querySelectorAll('details.standing')];
for(const row of rows)row.addEventListener('toggle',()=>{if(row.open)for(const other of rows)if(other!==row)other.open=false});
