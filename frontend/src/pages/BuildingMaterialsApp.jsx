import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
function formatP(n){ return `P ${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
export default function BuildingMaterialsApp(){
  const [token,setToken]=useState(localStorage.getItem('bq_token')||null);
  const [me,setMe]=useState(null);
  const [query,setQuery]=useState('');
  const [products,setProducts]=useState([]);
  const [quoteItems,setQuoteItems]=useState([]);
  const [currentQuotation,setCurrentQuotation]=useState(null);
  useEffect(()=>{ if(token){ axios.get(API_BASE + '/auth/me', { headers:{ Authorization:'Bearer '+token } }).then(r=>setMe(r.data.user)).catch(()=>{}); } },[token]);
  async function search(){ const res=await axios.get(`${API_BASE}/products?q=${encodeURIComponent(query)}`); setProducts(res.data||[]); }
  function addToQuote(p){ setQuoteItems(prev=>{ const ex=prev.find(x=>x.product_id===p.id); if(ex) return prev.map(x=>x===ex?{...x,qty:x.qty+1}:x); return [...prev,{product_id:p.id,name:p.name,unit_price:p.unit_price||p.price||0,qty:1,company_id:p.company_id}]; }); }
  function changeQty(i,q){ const copy=[...quoteItems]; copy[i].qty=Math.max(1,Number(q)||1); setQuoteItems(copy); }
  function removeItem(i){ const copy=[...quoteItems]; copy.splice(i,1); setQuoteItems(copy); }
  async function createQuotation(){ if(!quoteItems.length) return alert('add items'); const body={ buyerId:me?.id||null, companyId:quoteItems[0].company_id, items: quoteItems.map(it=>({productId:it.product_id,qty:it.qty})) }; const res=await axios.post(API_BASE+'/quotations', body, { headers: token?{ Authorization:'Bearer '+token } : {} }); const d=res.data; if(d.id){ setCurrentQuotation(d); alert('Quotation created: '+d.id);} else alert(JSON.stringify(d)); }
  async function createPayment(provider='stripe'){ if(!currentQuotation) return alert('create quotation'); const res=await axios.post(API_BASE+'/payments/create', { quotationId: currentQuotation.id, provider }, { headers: token?{ Authorization:'Bearer '+token }: {} }); const d=res.data; if(d.url) window.location.href=d.url; else alert(JSON.stringify(d)); }
  function downloadPdf(){
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('BuildQuote Quotation', 14, 20);
    let y=30;
    quoteItems.forEach((it,idx)=>{ doc.setFontSize(11); doc.text(`${idx+1}. ${it.name} — ${it.qty} x ${formatP(it.unit_price)} = ${formatP(it.qty*it.unit_price)}`, 14, y); y+=8; });
    if(currentQuotation){ y+=6; doc.text(`Subtotal: ${formatP(currentQuotation.subtotal)}`,14,y); y+=6; doc.text(`VAT: ${formatP(currentQuotation.vat)}`,14,y); y+=6; doc.text(`Total: ${formatP(currentQuotation.total)}`,14,y); }
    doc.save(`quotation_${Date.now()}.pdf`);
  }
  return (<div style={{padding:20}}><h1>BuildQuote Frontend (Vite)</h1>
    <div style={{marginBottom:10}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder='Search products'/> <button onClick={search}>Search</button></div>
    <div style={{display:'flex',gap:20}}>
      <div style={{flex:1}}><h3>Results</h3>{products.map(p=> <div key={p.id} style={{border:'1px solid #ddd',padding:8,margin:6}}><div style={{fontWeight:600}}>{p.name}</div><div style={{color:'#666'}}>{p.company_name}</div><div style={{fontWeight:700}}>{formatP(p.unit_price)}</div><div><button onClick={()=>addToQuote(p)}>Add</button></div></div>)}</div>
      <div style={{width:380}}><h3>Quotation</h3>{quoteItems.map((it,idx)=>(<div key={idx} style={{border:'1px solid #eee',padding:8,marginBottom:6}}><div style={{fontWeight:600}}>{it.name}</div><div>qty: <input type='number' value={it.qty} onChange={e=>changeQty(idx,e.target.value)} style={{width:60}} /></div><div style={{fontWeight:700}}>{formatP(it.unit_price*it.qty)}</div><div><button onClick={()=>removeItem(idx)}>Remove</button></div></div>))}<div><button onClick={createQuotation}>Create Quotation</button></div>{currentQuotation && <div style={{marginTop:8}}><div>Subtotal: {formatP(currentQuotation.subtotal)}</div><div>VAT: {formatP(currentQuotation.vat)}</div><div style={{fontWeight:800}}>Total: {formatP(currentQuotation.total)}</div><div style={{marginTop:8}}><button onClick={()=>createPayment('stripe')}>Pay with Card (Stripe)</button> <button onClick={()=>createPayment('orange')}>Pay with Orange</button></div><div style={{marginTop:8}}><button onClick={downloadPdf}>Download PDF</button></div></div>}</div>
    </div></div>);
}
