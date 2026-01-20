
import React, { useState } from 'react';
import { Product, Order } from '../types';
import { Link } from 'react-router-dom';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  onUpdateProduct: (p: Product) => void;
  onUpdateOrder: (id: string, status: any) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ products, orders, onUpdateProduct, onUpdateOrder }) => {
  const [tab, setTab] = useState<'inventory' | 'orders'>('inventory');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'price' | 'stock' | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'Pendiente').length;

  const OrderStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      'Pendiente': 'bg-orange-100 text-orange-600',
      'Pagado': 'bg-blue-100 text-blue-600',
      'Enviado': 'bg-indigo-100 text-indigo-600',
      'Completado': 'bg-green-100 text-green-600'
    };
    return <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${colors[status]}`}>{status}</span>;
  };

  const handleUpdate = (p: Product, field: 'price' | 'stock', value: string) => {
    const numVal = Number(value);
    if (!isNaN(numVal)) {
      onUpdateProduct({ ...p, [field]: numVal });
    }
    setEditingId(null);
    setEditingField(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fadeIn relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Panel de Control</h1>
          <p className="text-slate-500 text-sm font-bold mt-2 uppercase tracking-widest">Gestión de Inventario y Pedidos en Tiempo Real</p>
        </div>
        <div className="flex bg-white border border-slate-100 p-2 rounded-[1.5rem] shadow-sm">
          <button 
            onClick={() => setTab('inventory')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'inventory' ? 'bg-blue-600 shadow-xl shadow-blue-500/20 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <i className="fas fa-boxes mr-2"></i> Inventario
          </button>
          <button 
            onClick={() => setTab('orders')}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'orders' ? 'bg-blue-600 shadow-xl shadow-blue-500/20 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <i className="fas fa-receipt mr-2"></i> Pedidos
          </button>
        </div>
      </div>

      {/* Summary Cards with Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-20">
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm flex items-center gap-8 group hover:shadow-xl transition-all">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"><i className="fas fa-money-bill-wave"></i></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos</p>
            <p className="text-2xl font-black text-slate-900">${totalRevenue.toLocaleString('es-MX')}</p>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm flex items-center gap-8 group hover:shadow-xl transition-all">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"><i className="fas fa-clock"></i></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendientes</p>
            <p className="text-2xl font-black text-slate-900">{pendingOrders}</p>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm flex items-center gap-8 group hover:shadow-xl transition-all">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"><i className="fas fa-layer-group"></i></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Productos</p>
            <p className="text-2xl font-black text-slate-900">{products.length}</p>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm flex items-center gap-8 group hover:shadow-xl transition-all">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"><i className="fas fa-truck-loading"></i></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pedidos Totales</p>
            <p className="text-2xl font-black text-slate-900">{orders.length}</p>
          </div>
        </div>
      </div>

      {tab === 'inventory' ? (
        <div className="bg-white rounded-[3.5rem] border-2 border-slate-50 overflow-hidden shadow-2xl shadow-slate-200/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-10 py-8">Producto y Marca</th>
                <th className="px-10 py-8">Precio Unitario</th>
                <th className="px-10 py-8 text-center">Stock Disponible</th>
                <th className="px-10 py-8 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/20 transition-colors">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-6">
                      <img src={p.image} className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100" alt="" />
                      <div>
                        <p className="font-black text-slate-900 text-base leading-tight tracking-tighter">{p.name}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 bg-blue-50 px-2 py-0.5 rounded-full inline-block">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 font-mono font-black text-slate-800 text-lg">
                    {editingId === p.id && editingField === 'price' ? (
                      <div className="relative">
                        <input 
                          type="number" 
                          defaultValue={p.price} 
                          className="w-32 p-3 bg-white border-2 border-blue-500 rounded-xl outline-none shadow-xl" 
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdate(p, 'price', (e.target as HTMLInputElement).value)}
                          onBlur={(e) => handleUpdate(p, 'price', e.target.value)} 
                          autoFocus 
                        />
                      </div>
                    ) : (
                      <span onClick={() => { setEditingId(p.id); setEditingField('price'); }} className="cursor-pointer hover:text-blue-600 border-b-2 border-transparent hover:border-blue-200 transition-all pb-1">
                        ${p.price.toLocaleString('es-MX')}
                      </span>
                    )}
                  </td>
                  <td className="px-10 py-6 text-center">
                    {editingId === p.id && editingField === 'stock' ? (
                      <input 
                        type="number" 
                        defaultValue={p.stock} 
                        className="w-20 p-3 bg-white border-2 border-blue-500 rounded-xl outline-none shadow-xl text-center" 
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(p, 'stock', (e.target as HTMLInputElement).value)}
                        onBlur={(e) => handleUpdate(p, 'stock', e.target.value)} 
                        autoFocus 
                      />
                    ) : (
                      <span onClick={() => { setEditingId(p.id); setEditingField('stock'); }} className={`cursor-pointer font-black text-xl px-4 py-2 rounded-2xl transition-all ${p.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600'}`}>
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button onClick={() => { setEditingId(p.id); setEditingField('price'); }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                      <i className="fas fa-edit"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-[3rem] border-2 border-slate-50 p-10 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 group hover:shadow-2xl transition-all hover:border-white">
              <div className="flex-grow">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-mono font-black text-blue-600 tracking-tighter text-xl">{order.id}</h3>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center"><i className="fas fa-user"></i></div>
                   <div>
                     <p className="text-xl font-black text-slate-900 tracking-tighter">{order.userName}</p>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">{order.date}</p>
                   </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-8 items-center bg-slate-50/50 p-6 rounded-[2rem] lg:bg-transparent lg:p-0">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Liquidación</p>
                  <p className="text-3xl font-black text-slate-900">${order.total.toLocaleString('es-MX')}</p>
                </div>
                <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
                <select 
                  value={order.status} 
                  onChange={(e) => onUpdateOrder(order.id, e.target.value)}
                  className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Completado">Completado</option>
                </select>
                <button 
                  onClick={() => setViewingOrder(order)}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                >
                  Gestión Completa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-scaleIn border border-white">
            <div className="p-12">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 leading-none tracking-tighter italic">Resumen del Pedido</h2>
                  <p className="text-blue-600 font-mono font-black tracking-tighter text-2xl mt-2">{viewingOrder.id}</p>
                </div>
                <button onClick={() => setViewingOrder(null)} className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-all shadow-inner"><i className="fas fa-times text-xl"></i></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 pb-12 border-b-2 border-slate-50">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Expediente Cliente</h4>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="font-black text-slate-900 text-xl mb-1">{viewingOrder.userName}</p>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{viewingOrder.userEmail}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Logística y Destino</h4>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="mb-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha:</p>
                       <p className="text-sm text-slate-900 font-black">{viewingOrder.date}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación:</p>
                       <p className="text-sm text-slate-600 font-bold leading-relaxed">{viewingOrder.shippingAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Piezas Solicitadas</h4>
              <div className="space-y-6 mb-12">
                {viewingOrder.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-white border-2 border-slate-50 rounded-[2rem] hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-50">
                        <img src={item.image} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <Link to={`/product/${item.id}`} className="font-black text-slate-900 hover:text-blue-600 text-lg tracking-tighter block">{item.name}</Link>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Cantidad: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-black text-slate-900 text-xl">${(item.price * item.quantity).toLocaleString('es-MX')}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center p-10 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/30">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Importe Final Consolidado</span>
                  <p className="text-4xl font-black mt-1">${viewingOrder.total.toLocaleString('es-MX')}</p>
                </div>
                <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-4xl"><i className="fas fa-file-invoice"></i></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
