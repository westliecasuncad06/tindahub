# 🏪 TindaHub — Sari-Sari Store POS & Inventory System

Isang production-ready web application para sa Philippine sari-sari store. Dinisenyo para sa tablet at counter, may mabilis na bentahan (POS), sukli computation, imbentaryo, tubong kita tracker, at mga ulat na nada-download bilang CSV at PDF.

---

## 🚀 Setup sa XAMPP (Mas mababa sa 10 Hakbang)

1. **Ilagay ang proyekto sa htdocs**
   Siguraduhing ang folder ay nasa `C:\xampp\htdocs\store`.

2. **Buksan ang XAMPP Control Panel**
   Simulan (Start) ang **Apache** at **MySQL**.

3. **I-import ang Database Schema**
   Buksan ang terminal o command prompt at patakbuhin:
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tindahub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p tindahub < database/schema.sql
   ```
   *(Kung walang password ang root sa XAMPP, pindutin lamang ang Enter).*

4. **I-seed ang Sample Data**
   May kasamang 30 totoong paninda, 3 kategorya, at 2 linggong sample sales:
   ```bash
   mysql -u root -p tindahub < database/seed.sql
   ```

5. **I-check ang Database Connection**
   Buksan ang `config/db.php`. Naka-configure na ito sa default ng XAMPP:
   - Host: `127.0.0.1`
   - Port: `3306`
   - Database: `tindahub`
   - Username: `root`
   - Password: `""` (walang password)

6. **Buksan ang Web App sa Browser**
   Pumunta sa:
   👉 **`http://localhost/store/`** o **`http://localhost/store/pos`**

7. **Subukan ang Bentahan**
   - Pindutin ang `/` para maghanap ng paninda (hal. `Lucky Me` o `Kopiko`).
   - Pindutin ang `Enter` para idagdag sa cart.
   - Pindutin ang `F2` para pumunta sa bayad.
   - Piliin ang mabilisang cash (hal. ₱100) at pindutin ang **Kumpletuhin ang Benta**.

---

## 🛠️ Invariant & Stock Ledger Verification Query

Ang sistemang ito ay may **append-only stock movement ledger**. Ang dami ng stock sa `products.stock_qty` ay **palaging dapat katumbas** ng kabuuan ng `stock_movements.qty_change`:

```sql
SELECT 
    p.id,
    p.name AS paninda,
    p.stock_qty AS stock_sa_products,
    COALESCE(SUM(sm.qty_change), 0) AS kabuuang_sa_ledger,
    (p.stock_qty - COALESCE(SUM(sm.qty_change), 0)) AS diperensya
FROM products p
LEFT JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.id, p.name, p.stock_qty
HAVING ABS(diperensya) > 0.001;
```
> **Paalala:** Kung may lumabas sa query sa itaas, pumunta sa **Settings** (`/store/settings`) at i-click ang **"Suriin at Ayusin ang Stock"** para awtomatikong itama ang balanse.

---

## ⌨️ Mga Keyboard Shortcut sa Bentahan (POS)

| Pindutan | Aksyon |
|---|---|
| `/` | Tumutok agad sa Search bar |
| `Enter` | Idagdag ang unang resulta ng search sa cart |
| `1` hanggang `9` | Idagdag ang kaukulang produkto (1–9) sa cart |
| `F2` | Lumipat sa field ng Bayad ng kostumer |
| `Esc` | I-clear ang buong laman ng cart |
| `Space` | Magsimula ng Bagong Benta (kapag lumabas ang resibo) |

---

## 📄 Mga Ulat na Nada-download (`/store/reports`)

Available bilang **CSV (Excel na may UTF-8 BOM)** at **Printable A4 / PDF**:
1. **Imbentaryo Ngayon** — Lahat ng aktibong paninda, puhunan, benta, margin %, at total value.
2. **Galaw ng Stock** — Append-only ledger ng bawat purchase, sale, return, spoilage, at count.
3. **Konti na / Ubos** — Paubos na paninda kasama ang suggested reorder qty at estimated cost.
4. **Talaan ng Benta** — Lahat ng completed at voided sales, receipt number, profit, at cash.
5. **Buod ng Kita** — Araw-araw na benta, puhunan, tubo, gastos, at netong kita na may average.
6. **Bilang ng Paninda** — Physical count reconciliation outputs at shrinkage value.
7. **Gastos** — Operating expenses grouped by category.

---

## 🔒 Mga Sinadyang Iniwan para sa v2 (Structural Seams)

Alinsunod sa Section 11 ng disenyo, hindi muna isinama ang mga sumusunod sa v1 ngunit may nakahandang seams:
1. **Login at User Roles**: May nullable `user_id` column sa `sales` at `stock_movements`.
2. **Utang / Lista Ledger**: May modular structure para madaling ikabit ang `customers` at `credit_ledger` sa future update.
3. **Offline Mode**: Lahat ng network request ay dumadaan lamang sa iisang sentralisadong module (`assets/js/api.js`) upang madaling lagyan ng ServiceWorker at IndexedDB queue.
4. **Barcode Scanner**: Handa na ang `sku` column at instant LIKE/FULLTEXT search para sa USB/Bluetooth barcode scanner.
5. **Multiple Branches**: Walang hardcoded store name sa views; lahat ay binabasa mula sa `settings` table.

