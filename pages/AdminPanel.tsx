
import React, { useState } from 'react';
import { Product, Order } from '../types';
import { Link } from 'react-router-dom';
import CustomDropdown from '../components/CustomDropdown';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  onUpdateProduct: (p: Product) => void;
  onUpdateOrder: (id: string, status: any) => void;
  onCreateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUploadProductImage: (file: File) => Promise<string>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ products, orders, onUpdateProduct, onUpdateOrder, onCreateProduct, onDeleteProduct, onUploadProductImage }) => {
  const [tab, setTab] = useState<'inventory' | 'orders'>('inventory');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterOrderStatus, setFilterOrderStatus] = useState('All');
  const [editForm, setEditForm] = useState({
    name: '',
    price: 0,
    stock: 0,
    description: '',
    category: 'Cremallera Hidráulica' as const,
    brand: '',
    compatibleModels: '' as any
  });
  const [createForm, setCreateForm] = useState({
    name: '',
    price: 0,
    stock: 0,
    description: '',
    category: 'Cremallera Hidráulica' as const,
    brand: '',
    compatibleModels: '' as any
  });
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pendiente' || o.status === 'pagado' || o.status === 'enviado').length;

  const filteredProducts = filterCategory === 'All' 
    ? products 
    : products.filter(p => p.category === filterCategory);

  const filteredOrders = filterOrderStatus === 'All' 
    ? orders 
    : orders.filter(o => o.status?.toLowerCase() === filterOrderStatus.toLowerCase());

  const OrderStatusBadge = ({ status }: { status: string }) => {
    const statusLower = status?.toLowerCase() || '';
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-600',
      pagado: 'bg-blue-100 text-blue-600',
      enviado: 'bg-indigo-100 text-indigo-600',
      completado: 'bg-green-100 text-green-600',
      rejected: 'bg-red-100 text-red-600'
    };
    return <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${colors[statusLower] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description || '',
      category: product.category,
      brand: product.brand,
      compatibleModels: (product.compatibleModels || []).join(', ')
    });
    setEditImageFile(null);
    setShowEditModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      let imageUrl = editingProduct.image;
      try {
        if (editImageFile) {
          imageUrl = await onUploadProductImage(editImageFile);
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('Error al subir la imagen. Por favor intenta de nuevo.');
        return;
      }

      onUpdateProduct({
        ...editingProduct,
        name: editForm.name,
        price: editForm.price,
        stock: editForm.stock,
        description: editForm.description,
        category: editForm.category,
        brand: editForm.brand,
        image: imageUrl,
        compatibleModels: editForm.compatibleModels.split(',').map((m: string) => m.trim()).filter((m: string) => m)
      });
      closeEditModal();
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    setEditForm({
      name: '',
      price: 0,
      stock: 0,
      description: '',
      category: 'Cremallera Hidráulica' as const,
      brand: '',
      compatibleModels: '' as any
    });
    setEditImageFile(null);
  };

  const openCreateModal = () => {
    setCreateForm({
      name: '',
      price: 0,
      stock: 0,
      description: '',
      category: 'Cremallera Hidráulica' as const,
      brand: '',
      compatibleModels: '' as any
    });
    setCreateImageFile(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createImageFile) {
      alert('Por favor agrega una imagen');
      return;
    }
    let imageUrl = '';
    try {
      if (createImageFile) {
        imageUrl = await onUploadProductImage(createImageFile);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
      return;
    }
    const newProduct: Product = {
      id: `tmp-${Date.now()}`,
      name: createForm.name,
      category: createForm.category,
      brand: createForm.brand,
      compatibleModels: createForm.compatibleModels.split(',').map((m: string) => m.trim()).filter((m: string) => m),
      price: createForm.price,
      stock: createForm.stock,
      image: imageUrl,
      description: createForm.description,
    };
    onCreateProduct(newProduct);
    closeCreateModal();
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
        <div className="space-y-8">
          <div className="flex flex-wrap gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 items-end">
            <CustomDropdown 
              label="Filtrar por Categoría" 
              options={['All', 'Cremallera Hidráulica', 'Cremallera Electrónica', 'Bomba Hidráulica']} 
              selected={filterCategory} 
              onSelect={setFilterCategory} 
              placeholder="Todas las Categorías"
            />
            <button 
              onClick={openCreateModal}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 rounded-2xl transition-all shadow-lg h-[52px]"
            >
              <i className="fas fa-plus"></i> Agregar Producto
            </button>
            <button 
              onClick={() => setFilterCategory('All')}
              className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 rounded-2xl transition-all shadow-lg h-[52px]"
            >
              <i className="fas fa-undo"></i> Reiniciar
            </button>
          </div>
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
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-8 text-center text-slate-400">No hay productos disponibles</td>
                </tr>
              ) : (
                filteredProducts.map(p => (
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
                      ${p.price.toLocaleString('es-MX')}
                    </td>
                    <td className="px-10 py-6 text-center">
                      <span className={`cursor-pointer font-black text-xl px-4 py-2 rounded-2xl transition-all ${p.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-700'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button onClick={() => openEditModal(p)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Eliminar el producto "${p.name}"?`)) onDeleteProduct(p.id);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex flex-wrap gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 items-end">
            <CustomDropdown 
              label="Filtrar por Estado" 
              options={['All', 'Pendiente', 'Pagado', 'Enviado', 'Completado']} 
              selected={filterOrderStatus} 
              onSelect={setFilterOrderStatus} 
              placeholder="Todos los Estados"
            />
            <button 
              onClick={() => setFilterOrderStatus('All')}
              className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 rounded-2xl transition-all shadow-lg h-[52px]"
            >
              <i className="fas fa-undo"></i> Reiniciar
            </button>
          </div>
          <div className="space-y-8">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-[3rem] border-2 border-slate-50 p-10 text-center">
              <p className="text-slate-400 font-bold">No hay pedidos disponibles</p>
            </div>
          ) : (
            filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-[3rem] border-2 border-slate-50 p-10 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 group hover:shadow-2xl transition-all hover:border-white">
              <div className="flex-grow">
                <div className="flex items-center gap-4 mb-4">
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
                <div className="min-w-[180px]">
                  <CustomDropdown 
                    label=""
                    options={['Pendiente', 'Pagado', 'Enviado', 'Completado']}
                    selected={order.status}
                    onSelect={(val) => onUpdateOrder(order.id, val)}
                  />
                </div>
                <button 
                  onClick={() => setViewingOrder(order)}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                >
                  Gestión Completa
                </button>
              </div>
            </div>
            ))
          )}
          </div>
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
                        <Link to={`/product/${item.id}`} onClick={() => setViewingOrder(null)} className="font-black text-slate-900 hover:text-blue-600 text-lg tracking-tighter block">{item.name}</Link>
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

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-scaleIn border border-white">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Editar Producto</h2>
              <button onClick={closeEditModal} className="w-12 h-12 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-all shadow-sm"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Nombre del producto"
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subir nueva imagen</label>
                  <label className="flex items-center justify-between w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all">
                    <span className="text-sm font-bold text-slate-700 truncate">
                      {editImageFile ? editImageFile.name : 'Seleccionar archivo'}
                    </span>
                    <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-xl shadow">
                      Subir
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setEditImageFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio *</label>
                  <input 
                    type="number" 
                    required 
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={editForm.price} 
                    onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock *</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="0"
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={editForm.stock} 
                    onChange={e => setEditForm({...editForm, stock: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalles del Producto</label>
                <textarea 
                  placeholder="Descripción del producto, características principales..."
                  className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800 resize-none h-24"
                  value={editForm.description} 
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ficha Técnica</h3>
                <div className="grid grid-cols-1 gap-6">
                  <CustomDropdown 
                    label="Categoría"
                    options={['Cremallera Hidráulica', 'Cremallera Electrónica', 'Bomba Hidráulica']}
                    selected={editForm.category}
                    onSelect={(val: any) => setEditForm({...editForm, category: val})}
                    required
                  />
                  <CustomDropdown 
                    label="Marca"
                    options={['', 'Abarth', 'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 'BYD', 'Cadillac', 'Changan', 'Chery', 'Chevrolet', 'Chrysler', 'Citroën', 'Cupra', 'Dacia', 'Daihatsu', 'Dodge', 'DS Automobiles', 'Ferrari', 'Fiat', 'Ford', 'Geely', 'Genesis', 'GMC', 'Great Wall', 'Haval', 'Honda', 'Hyundai', 'Infiniti', 'Isuzu', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Lotus', 'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Ram', 'Renault', 'Rolls-Royce', 'SEAT', 'Skoda', 'Smart', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'FAW', 'Foton', 'JAC', 'Jetour', 'Kaiyi']}
                    selected={editForm.brand}
                    onSelect={(val) => setEditForm({...editForm, brand: val})}
                    placeholder="Selecciona una marca"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelos y Años Compatibles</label>
                <textarea 
                  placeholder="Ej: Corolla 2010-2015, Civic 2012-2016, Sentra 2014-2018"
                  className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800 resize-none h-24"
                  value={editForm.compatibleModels} 
                  onChange={e => setEditForm({...editForm, compatibleModels: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={closeEditModal} className="flex-grow py-5 bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" className="flex-grow py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all transform hover:-translate-y-1">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-scaleIn border border-white">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Nuevo Producto</h2>
              <button onClick={closeCreateModal} className="w-12 h-12 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-all shadow-sm"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateProduct} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Nombre del producto"
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={createForm.name} 
                    onChange={e => setCreateForm({...createForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subir imagen *</label>
                  <label className="flex items-center justify-between w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all">
                    <span className="text-sm font-bold text-slate-700 truncate">
                      {createImageFile ? createImageFile.name : 'Seleccionar archivo'}
                    </span>
                    <span className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-xl shadow">
                      Subir
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setCreateImageFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio *</label>
                  <input 
                    type="number" 
                    required 
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={createForm.price} 
                    onChange={e => setCreateForm({...createForm, price: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock *</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    placeholder="0"
                    className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800"
                    value={createForm.stock} 
                    onChange={e => setCreateForm({...createForm, stock: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalles del Producto</label>
                <textarea 
                  placeholder="Descripción del producto, características principales..."
                  className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800 resize-none h-24"
                  value={createForm.description} 
                  onChange={e => setCreateForm({...createForm, description: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ficha Técnica</h3>
                <div className="grid grid-cols-1 gap-6">
                  <CustomDropdown 
                    label="Categoría"
                    options={['Cremallera Hidráulica', 'Cremallera Electrónica', 'Bomba Hidráulica']}
                    selected={createForm.category}
                    onSelect={(val: any) => setCreateForm({...createForm, category: val})}
                    required
                  />
                  <CustomDropdown 
                    label="Marca"
                    options={['', 'Abarth', 'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 'BYD', 'Cadillac', 'Changan', 'Chery', 'Chevrolet', 'Chrysler', 'Citroën', 'Cupra', 'Dacia', 'Daihatsu', 'Dodge', 'DS Automobiles', 'Ferrari', 'Fiat', 'Ford', 'Geely', 'Genesis', 'GMC', 'Great Wall', 'Haval', 'Honda', 'Hyundai', 'Infiniti', 'Isuzu', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Lincoln', 'Lotus', 'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Ram', 'Renault', 'Rolls-Royce', 'SEAT', 'Skoda', 'Smart', 'Subaru', 'Suzuki', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'FAW', 'Foton', 'JAC', 'Jetour', 'Kaiyi']}
                    selected={createForm.brand}
                    onSelect={(val) => setCreateForm({...createForm, brand: val})}
                    placeholder="Selecciona una marca"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelos y Años Compatibles</label>
                <textarea 
                  placeholder="Ej: Corolla 2010-2015, Civic 2012-2016, Sentra 2014-2018"
                  className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-800 resize-none h-24"
                  value={createForm.compatibleModels} 
                  onChange={e => setCreateForm({...createForm, compatibleModels: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={closeCreateModal} className="flex-grow py-5 bg-slate-50 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" className="flex-grow py-5 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all transform hover:-translate-y-1">Crear Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
