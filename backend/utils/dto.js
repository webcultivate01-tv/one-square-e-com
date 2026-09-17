/**
 * DTOs — never spread a Sequelize row to the client.
 * Every module whitelists exactly the fields the UI needs.
 */

export const toPublicUser = (u) => {
  if (!u) return null;
  return {
    _id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    role: u.role,
    avatar: u.avatar || "",
    address: u.address || {},
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    isVerified: Boolean(u.isVerified),
    isActive: u.isActive !== false,
    mustChangePassword: Boolean(u.mustChangePassword),
  };
};

export const toAdminDTO = (u) => {
  if (!u) return null;
  return {
    _id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    role: u.role,
    isActive: u.isActive !== false,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    avatar: u.avatar || "",
    gender: u.gender || "",
    dateOfBirth: u.dateOfBirth || null,
    address: u.address || {},
    lastLogin: u.lastLogin || null,
    mustChangePassword: Boolean(u.mustChangePassword),
    createdBy: u.createdByDetails
      ? { _id: u.createdByDetails.id, name: u.createdByDetails.name, email: u.createdByDetails.email }
      : u.createdBy || null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
};

export const toCustomerListDTO = (u) => {
  if (!u) return null;
  return {
    _id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "",
    avatar: u.avatar || "",
    customerStatus: u.customerStatus || "active",
    isVerified: Boolean(u.isVerified),
    isDeleted: Boolean(u.isDeleted),
    tags: Array.isArray(u.tags) ? u.tags : [],
    address: u.address || {},
    totalOrders: u.totalOrders || 0,
    totalSpent: Math.round((u.totalSpent || 0) * 100) / 100,
    lastLogin: u.lastLogin || null,
    loginCount: u.loginCount || 0,
    createdAt: u.createdAt,
  };
};

export const toCustomerDetailDTO = (u) => {
  if (!u) return null;
  return {
    ...toCustomerListDTO(u),
    gender: u.gender || "",
    dateOfBirth: u.dateOfBirth || null,
    statusReason: u.statusReason || "",
    statusChangedAt: u.statusChangedAt || null,
    deletedAt: u.deletedAt || null,
    lastLoginIp: u.lastLoginIp || "",
    lastLoginDevice: u.lastLoginDevice || "",
    lastLoginLocation: u.lastLoginLocation || "",
    mustChangePassword: Boolean(u.mustChangePassword),
    notes: (u.notes || []).map((n) => ({
      _id: n.id,
      body: n.body,
      authorName: n.authorName || "",
      author: n.author || null,
      createdAt: n.createdAt,
    })),
    updatedAt: u.updatedAt,
  };
};

export const toProductDTO = (p) => {
  if (!p) return null;
  const category = p.categoryDetails
    ? { _id: p.categoryDetails.id, name: p.categoryDetails.name, slug: p.categoryDetails.slug }
    : p.category || null;
  return {
    _id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description || "",
    richDescription: p.richDescription || "",
    sku: p.sku || "",
    brand: p.brand || "",
    category,
    subcategory: p.subcategory || "",
    tags: p.tags || [],
    price: p.price || 0,
    discountPrice: p.discountPrice || 0,
    costPrice: p.costPrice || 0,
    tax: p.tax || 0,
    currency: p.currency || "USD",
    stock: p.stock || 0,
    lowStockThreshold: p.lowStockThreshold ?? 10,
    minOrderQuantity: p.minOrderQuantity ?? 1,
    maxOrderQuantity: p.maxOrderQuantity ?? 9999,
    weight: p.weight || 0,
    dimensions: p.dimensions || { length: 0, width: 0, height: 0 },
    shippingCost: p.shippingCost || 0,
    deliveryEstimate: p.deliveryEstimate || "",
    images: p.images || [],
    variants: (p.variants || []).map((v) => ({
      _id: v.id || v._id,
      sku: v.sku || "",
      options: v.options || {},
      price: v.price || 0,
      discountPrice: v.discountPrice || 0,
      stock: v.stock || 0,
      images: v.images || [],
      isAvailable: v.isAvailable !== false,
    })),
    metaTitle: p.metaTitle || "",
    metaDescription: p.metaDescription || "",
    seoKeywords: p.seoKeywords || [],
    isFeatured: Boolean(p.isFeatured),
    isBestseller: Boolean(p.isBestseller),
    isTrending: Boolean(p.isTrending),
    isNewArrival: Boolean(p.isNewArrival),
    status: p.status,
    isPublished: Boolean(p.isPublished),
    isDeleted: Boolean(p.isDeleted),
    salesCount: p.salesCount || 0,
    viewsCount: p.viewsCount || 0,
    averageRating: p.averageRating || 0,
    reviewCount: p.reviewCount || 0,
    isLowStock: Boolean(p.isLowStock),
    isOutOfStock: Boolean(p.isOutOfStock),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
};

export const toOrderDTO = (o) => {
  if (!o) return null;
  const user = o.userDetails
    ? { _id: o.userDetails.id, name: o.userDetails.name, email: o.userDetails.email, phone: o.userDetails.phone }
    : o.user || null;
  return {
    _id: o.id,
    shortId: String(o.id).replace(/-/g, "").slice(-8).toUpperCase(),
    user,
    items: (o.items || []).map((i) => ({
      product: i.productDetails || i.product || null,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      variantId: i.variantId || "",
      variantOptions: i.variantOptions || {},
    })),
    shippingAddress: o.shippingAddress || {},
    subtotal: o.subtotal || 0,
    discount: o.discount || 0,
    coupon: o.coupon || null,
    shippingCost: o.shippingCost || 0,
    tax: o.tax || 0,
    total: o.total || 0,
    currency: o.currency || "USD",
    status: o.status,
    paymentStatus: o.paymentStatus,
    stripePaymentId: o.stripePaymentId || "",
    stripeChargeId: o.stripeChargeId || "",
    stripeRefundId: o.stripeRefundId || "",
    paymentMethod: o.paymentMethod || "card",
    cardBrand: o.cardBrand || "",
    cardLast4: o.cardLast4 || "",
    receiptUrl: o.receiptUrl || "",
    paidAt: o.paidAt,
    refundedAt: o.refundedAt || null,
    refundedAmount: o.refundedAmount || 0,
    invoiceNumber: o.invoiceNumber || "",
    trackingNumber: o.trackingNumber || "",
    carrier: o.carrier || "",
    statusHistory: o.statusHistory || [],
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};
