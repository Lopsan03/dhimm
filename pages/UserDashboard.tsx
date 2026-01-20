
import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { User, Order } from '../types';

interface UserDashboardProps {
  user: User;
  orders: Order[];
  onUpdateUser: (u: User) => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, orders, onUpdateUser }) => {
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    city: 'Monterrey',
    state: 'Nuevo León',
    zip: '',
    country: 'México'
  });

  const pendingOrders = orders.filter(o => ['Pendiente', 'Pagado'].includes(o.status));
  const completedOrders = orders.filter(o => ['Enviado', 'Completado'].includes(o.status));

  const OrderStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      'Pendiente': 'bg-orange-100 text-orange-600',
      'Pagado': 'bg-blue-100 text-blue-600',
      'Enviado': 'bg-indigo-100 text-indigo-600',
      'Completado': 'bg-green-100 text-green-600'
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${colors[status]}`}>{status}</span>;
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = `${addressForm.label ? `[${addressForm.label}] ` : ''}${addressForm.street}, ${addressForm.city}, ${addressForm.state}, CP ${addressForm.zip}, ${addressForm.country}`;
    
    let updatedAddresses = [...user.addresses];
    if (editingIndex !== null) {
      updatedAddresses[editingIndex] = formatted;
    } else {
      updatedAddresses.push(formatted);
    }

    onUpdateUser({ ...user, addresses: updatedAddresses });
    closeModal();
  };

  const openModal = (idx: number | null = null) => {
    if (idx !== null) {
      setEditingIndex(idx);
      // Attempt to parse existing address
      const fullAddr = user.addresses[idx];
      const hasLabel = fullAddr.startsWith('[');
      let label = '';
      let remaining = fullAddr;
      
      if (hasLabel) {
        const endLabel = fullAddr.indexOf(']');
        label = fullAddr.substring(1, endLabel);
        remaining = fullAddr.substring(endLabel + 2);
      }
      
      const parts = remaining.split(', ');
      setAddressForm({
        label: label,
        street: parts[0] || '',
        city: parts[1] || 'Monterrey',
        state: parts[2] || 'Nuevo León',
        zip: parts[3]?.replace('CP ', '') || '',
        country: parts[4] || 'México'
      });
    } else {
      setEditingIndex(null);
      setAddressForm({ label: '', street: '', city: 'Monterrey', state: 'Nuevo León', zip: '', country: 'México' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIndex(null);
  };

  const handleRemoveAddress = (idx: number) => {
    onUpdateUser({ ...user, addresses: user.addresses.filter((_, i) => i !== idx) });
  };

  const OrderList = ({ list, title }: { list: Order[], title: string }) => (
    <div className="space-y-6 animate-fadeIn">
      <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{title}</h1>
      {list.length > 0 ? (
        <div className="space-y-4">
          {list.map(order => (
            <div key={order.id} className="bg-white rounded-[2rem] border-2 border-slate-50 p-8 shadow-sm hover:shadow-xl transition-all">
              <div className="flex flex-col sm:flex-row justify-between gap-6 mb-6">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Pedido</p><p className="font-mono text-blue-600 font-bold">{order.id}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p><OrderStatusBadge status={order.status} /></div>
                <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total MXN</p><p className="text-xl font-black text-slate-900">${order.total.toLocaleString('es-MX')}</p></div>
              </div>
              <div className="border-t border-slate-50 pt-6"><div className="flex flex-wrap gap-2">{order.items.map(item => (<span key={item.id} className="text-[10px] font-bold bg-slate-50 px-4 py-2 rounded-full border border-slate-100 text-slate-600">{item.quantity}x {item.name}</span>))}</div></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-24 text-center border-2 border-dashed border-slate-200 shadow-sm"><p className="text-slate-400 font-bold text-lg">No hay registros para mostrar</p></div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-80">
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 p-8 shadow-lg overflow-hidden sticky top-24">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner"><i className="fas fa-user-circle text-4xl"></i></div>
              <h2 className="font-black text-slate-900 text-xl">{user.name}</h2>
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-full mt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
            <nav className="space-y-2">
              <Link to="/dashboard" className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${location.pathname === '/dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fas fa-shopping-bag"></i> Pedidos</Link>
              <Link to="/dashboard/history" className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${location.pathname === '/dashboard/history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fas fa-history"></i> Historial</Link>
              <Link to="/dashboard/addresses" className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${location.pathname === '/dashboard/addresses' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}><i className="fas fa-map-marked-alt"></i> Direcciones</Link>
            </nav>
          </div>
        </aside>

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<OrderList list={pendingOrders} title="Mis Pedidos Actuales" />} />
            <Route path="/history" element={<OrderList list={completedOrders} title="Historial de Pedidos" />} />
            <Route path="/addresses" element={
              <div className="space-y-10 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Mis Direcciones</h1>
                  <button 
                    onClick={() => openModal()}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all transform hover:-translate-y-1"
                  >
                    <i className="fas fa-plus mr-2"></i> Nueva Dirección
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {user.addresses.map((addr, i) => (
                    <div key={i} className="bg-white p-10 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:shadow-xl transition-all group relative">
                      <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-inner"><i className="fas fa-home text-2xl"></i></div>
                      <p className="text-slate-700 font-bold text-lg leading-relaxed mb-10">{addr}</p>
                      <div className="flex gap-6 pt-6 border-t border-slate-50">
                        <button onClick={() => openModal(i)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline flex items-center gap-2 transition-all"><i className="fas fa-edit"></i> Editar</button>
                        <button onClick={() => handleRemoveAddress(i)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline flex items-center gap-2 transition-all"><i className="fas fa-trash-alt"></i> Eliminar</button>
                      </div>
                    </div>
                  ))}
                  {user.addresses.length === 0 && (
                    <div className="md:col-span-2 bg-white rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200 shadow-sm">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300"><i className="fas fa-map-marker-alt text-3xl"></i></div>
                      <p className="text-slate-400 font-black text-xl tracking-tighter">No tienes direcciones guardadas</p>
                      <button onClick={() => openModal()} className="mt-6 text-blue-600 font-black uppercase tracking-widest text-xs">Agregar la primera ahora</button>
                    </div>
                  )}
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>

      {/* Address Modal (Popup) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[3rem] max-w-xl w-full shadow-2xl overflow-hidden animate-scaleIn border border-white">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{editingIndex !== null ? 'Editar Dirección' : 'Nueva Dirección'}</h2>
              <button onClick={closeModal} className="w-12 h-12 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-all shadow-sm"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etiqueta (opcional)</label>
                <input 
                  type="text" placeholder="Ej: Casa, Oficina" 
                  className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                  value={addressForm.label} onChange={e => setAddressForm({...addressForm, label: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Calle y Número *</label>
                <input 
                  type="text" required placeholder="Calle, número, colonia" 
                  className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                  value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciudad *</label>
                  <input 
                    type="text" required 
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado *</label>
                  <input 
                    type="text" required 
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Postal *</label>
                  <input 
                    type="text" required 
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={addressForm.zip} onChange={e => setAddressForm({...addressForm, zip: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">País</label>
                  <input 
                    type="text" required 
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={addressForm.country} onChange={e => setAddressForm({...addressForm, country: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={closeModal} className="flex-grow py-5 bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" className="flex-grow py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all transform hover:-translate-y-1">{editingIndex !== null ? 'Actualizar Dirección' : 'Agregar Dirección'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
