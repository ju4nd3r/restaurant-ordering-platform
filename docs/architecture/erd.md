# Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    Restaurant ||--o{ RestaurantTable : tiene
    Restaurant ||--o{ Category : organiza
    Restaurant ||--o{ MenuItem : ofrece
    Restaurant ||--o{ User : emplea
    Restaurant ||--o{ Shift : programa
    Restaurant ||--o{ Order : procesa
    Restaurant ||--o{ ElectronicInvoice : emite

    RestaurantTable ||--o{ TableSession : hospeda
    TableSession ||--o{ Order : contiene
    TableSession ||--o{ BillSplit : divide

    Category ||--o{ MenuItem : agrupa
    MenuItem ||--o{ MenuItemOptionGroup : configura
    MenuItemOptionGroup ||--o{ MenuItemOption : contiene
    MenuItem ||--o{ MenuItemModifier : permite
    MenuItem ||--o{ MenuItemImage : muestra

    Order ||--o{ OrderItem : detalla
    OrderItem ||--o{ OrderItemModifierSelection : incluye
    OrderItem ||--o{ OrderItemOptionSelection : elige
    Order ||--o{ OrderStatusHistory : registra

    BillSplit ||--o{ BillSplitItemAllocation : asigna
    BillSplit ||--o{ PaymentTransaction : cobra
    PaymentTransaction ||--o? ElectronicInvoice : factura
    PaymentTransaction ||--o? TipAllocation : asigna_propina

    User ||--o{ UserRole : tiene
    User ||--o{ ShiftStaff : trabaja
    User ||--o{ RestaurantTable : asignado_a
    User ||--o{ Order : atiende
```
