import React, { useEffect, useState } from "react";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000/api";
function formatP(n){ return `P ${Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
export default function BuildingMaterialsApp(){
  const [token,setToken]=useState(localStorage.getItem('bq_token')||null);
  const [me,setMe]=useState(null);
  const [query,setQuery]=useState('');
  const [products,setProducts]=useState([]);
  const [quoteItems,setQuoteItems]=useState([]);
  const [currentQuotation,setCurrentQuotation]=useState(null);
  useEffect(()=>{ if(token){ fetch(API_BASE+'/auth/me',{headers:{Authorization:'Bearer '+token}}).then(r=>r.json()).then(d=>setMe(d.user)).catch(()=>{}); } },[token]);
  async function search(){ const res=await fetch(`${API_BASE}/products?q=${encodeURIComponent(query)}`); const data=await res.json(); setProducts(data||[]); }
  function addToQuote(p){ setQuoteItems(prev=>{ const ex=prev.find(x=>x.product_id===p.id); if(ex) return prev.map(x=>x===ex?{...x,qty:x.qty+1}:x); return [...prev,{product_id:p.id,name:p.name,unit_price:p.unit_price||p.price||0,qty:1,company_id:p.company_id}] }); }
  function changeQty(i,q){ const copy=[...quoteItems]; copy[i].qty=Math.max(1,Number(q)||1); setQuoteItems(copy); }
  function removeItem(i){ const copy=[...quoteItems]; copy.splice(i,1); setQuoteItems(copy); }
  async function createQuotation(){ if(!quoteItems.length) return alert('add items'); const body={ buyerId:me?.id||null, companyId:quoteItems[0].company_id, items: quoteItems.map(it=>({productId:it.product_id,qty:it.qty})) }; const res=await fetch(API_BASE+'/quotations',{method:'POST',headers:{'Content-Type':'application/json', Authorization: token? 'Bearer '+token: undefined}, body:JSON.stringify(body)}); const d=await res.json(); if(d.id){ setCurrentQuotation(d); alert('Quotation created: '+d.id);} else alert(JSON.stringify(d)); }
  async function createPayment(provider='stripe'){ if(!currentQuotation) return alert('create quotation'); const res=await fetch(API_BASE+'/payments/create',{method:'POST',headers:{'Content-Type':'application/json', Authorization: token? 'Bearer '+token: undefined}, body:JSON.stringify({quotationId:currentQuotation.id, provider})}); const d=await res.json(); if(d.url) window.location.href=d.url; else alert(JSON.stringify(d)); }
  return (<div style={{padding:20}}><h1>BuildQuote Connected Demo</h1>
    <div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder='search'/> <button onClick={search}>Search</button></div>
    <div style={{display:'flex',gap:20,marginTop:10}}>
      <div style={{flex:1}}><h3>Results</h3>{products.map(p=> <div key={p.id} style={{border:'1px solid #ddd',padding:8,margin:6}}><div>{p.name}</div><div>{p.company_name}</div><div>{formatP(p.unit_price)}</div><button onClick={()=>addToQuote(p)}>Add</button></div>)}</div>
      <div style={{width:380}}><h3>Quotation</h3>{quoteItems.map((it,idx)=>(<div key={idx}><div>{it.name}</div><div>qty: <input type='number' value={it.qty} onChange={e=>changeQty(idx,e.target.value)} /></div><div>{formatP(it.unit_price*it.qty)}</div><button onClick={()=>removeItem(idx)}>Remove</button></div>))}<div><button onClick={createQuotation}>Create Quotation</button></div>{currentQuotation && <div><div>Subtotal: {formatP(currentQuotation.subtotal)}</div><div>VAT: {formatP(currentQuotation.vat)}</div><div>Total: {formatP(currentQuotation.total)}</div><button onClick={()=>createPayment('stripe')}>Pay (Stripe)</button></div>}</div>
    </div></div>);
}
