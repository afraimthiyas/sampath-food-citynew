import { Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import { RequireAuth, RequireStaff } from './components/Guards';
import Layout from './components/Layout';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import Login from './pages/Login';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import ProductPage from './pages/ProductPage';
import Register from './pages/Register';
import Shop from './pages/Shop';
import AdminCustomers from './pages/admin/Customers';
import AdminDashboard from './pages/admin/Dashboard';
import AdminInventory from './pages/admin/Inventory';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="orders" element={<RequireAuth><MyOrders /></RequireAuth>} />
        <Route path="orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
        <Route path="admin" element={<RequireStaff><AdminLayout /></RequireStaff>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
        </Route>
        <Route path="*" element={<div className="container page"><h1>Page not found</h1></div>} />
      </Route>
    </Routes>
  );
}
