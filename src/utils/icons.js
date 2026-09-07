// Registro central de iconos Lucide, mapeados desde los nombres semanticos
// (heredados de Material Icons) que usa el resto de la app. Un solo lugar
// para agregar/cambiar iconos sin tocar cada pantalla.
import {
  CircleUserRound, Plus, ImagePlus, ShoppingCart, ArrowLeft, Sparkles, Ban,
  Calculator, XCircle, Package, MessageCircle, Check, CircleCheck, X,
  CloudUpload, LayoutDashboard, Moon, Trash2, FileText, Pencil, PenLine,
  ChevronDown, Disc3, Inbox, Boxes, Layers, Sun, Truck, Lock, LogOut, Menu,
  PanelLeftClose, Users, CreditCard, Printer, ClipboardList, Minus,
  MinusCircle, Save, Clock, Search, Settings, Store, ArrowLeftRight,
  SlidersHorizontal, Upload, Box, Eye, EyeOff, TriangleAlert, Palette,
  Phone, Mail, Tag, DollarSign, CalendarDays, TrendingUp, Hash, Weight
} from '@lucide/vue';

export const ICONS = {
  account_circle: CircleUserRound,
  add: Plus,
  add_photo_alternate: ImagePlus,
  add_shopping_cart: ShoppingCart,
  arrow_back: ArrowLeft,
  auto_awesome: Sparkles,
  block: Ban,
  calculate: Calculator,
  cancel: XCircle,
  category: Package,
  chat: MessageCircle,
  check: Check,
  check_circle: CircleCheck,
  close: X,
  cloud_upload: CloudUpload,
  dashboard: LayoutDashboard,
  dark_mode: Moon,
  delete: Trash2,
  description: FileText,
  edit: Pencil,
  edit_note: PenLine,
  expand_more: ChevronDown,
  grain: Disc3,
  inbox: Inbox,
  inventory_2: Boxes,
  layers: Layers,
  light_mode: Sun,
  local_shipping: Truck,
  lock: Lock,
  logout: LogOut,
  menu: Menu,
  menu_open: PanelLeftClose,
  palette: Palette,
  people: Users,
  // Metadatos de tarjeta
  phone: Phone,
  mail: Mail,
  tag: Tag,
  price: DollarSign,
  calendar: CalendarDays,
  trending_up: TrendingUp,
  hash: Hash,
  weight: Weight,
  point_of_sale: CreditCard,
  print: Printer,
  receipt_long: ClipboardList,
  remove: Minus,
  remove_circle_outline: MinusCircle,
  save: Save,
  schedule: Clock,
  search: Search,
  settings: Settings,
  shopping_cart: ShoppingCart,
  storefront: Store,
  swap_horiz: ArrowLeftRight,
  tune: SlidersHorizontal,
  upload_file: Upload,
  view_in_ar: Box,
  visibility: Eye,
  visibility_off: EyeOff,
  warning: TriangleAlert
};

// Alias de colores: acepta tanto tokens propios (Additive) como los nombres
// de color de Quasar que ya se usaban en el codigo (positive/negative/grey-6...).
const TOKEN_MAP = {
  accent: 'var(--accent)',
  tech: 'var(--tech)',
  electric: 'var(--electric)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--info)',
  muted: 'var(--text-muted)',
  secondary: 'var(--text-secondary)',
  primary: 'var(--text-primary)',
  // alias de colores Quasar usados antes de la migracion a iconos propios
  positive: 'var(--success)',
  negative: 'var(--danger)',
  'grey-6': 'var(--text-muted)',
  'grey-5': 'var(--text-muted)',
  grey: 'var(--text-muted)'
};

export function resolveIconColor(color) {
  if (!color) return 'currentColor';
  return TOKEN_MAP[color] || color;
}
