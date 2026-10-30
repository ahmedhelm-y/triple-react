# تدقيق تطابق الهجرة — Triple (Twig → React)

> تاريخ التدقيق: 2026-10-30 · المرجع: `triple_twig` مقابل `triple_react`
> الهدف: خريطة كاملة للفجوات المتبقية قبل ديسمبر 2026، مرتّبة بالأولوية.

## ملخص تنفيذي

| المحور | الحالة | الفجوة |
|--------|--------|--------|
| الصفحات / routes | ✅ جيد | الرياكت بيغطّي كل صفحات التويج + زيادة |
| المكوّنات (components) | ✅ جيد جدًا | كل مكوّنات التويج موجودة؛ مكوّنين بس ناقصهم حقل واحد |
| حقول المكوّنات | ✅ جيد | 567 (React) مقابل 560 (Twig) |
| **إعدادات التصميم العامة** | ❌ **حرِج** | **328 من 343 ناقصة (~94%)** |
| توصيل الإعدادات بالكود | ⚠️ ضعيف | من 18 إعداد معرّف، 9 بس مستهلكين في الكود |
| الترجمات (locales) | ⚠️ متوسط | 98 مفتاح في التويج مش في الرياكت |
| باجات قراءة الحقول الخام | ⚠️ 9 مكوّنات مشبوهة | نفس نوع باج `collectionField/pickLang` |

**الخلاصة:** الهوم والأقسام والصفحات اتنقلت كويس. الحفرة الكبيرة = **الإعدادات العامة** (تخصيص التاجر للتصميم). دي أكبر كتلة شغل متبقّية.

---

## P0 — إعدادات التصميم العامة (الأولوية القصوى)

`twilight.json` → `settings`: التويج فيه **343** إعداد فعلي، الرياكت فيه **15** بس (+ 3 إضافات خاصة بالرياكت). الناقص **328**، موزّعين بالقسم:

| القسم | ناقص / إجمالي | أمثلة على اللي ناقص |
|-------|---------------|---------------------|
| **colors** | 25 / 25 | `store_bg`, `header_bg`, `footer_bg`, `product_bg`, `store_text_color`, `force_text_color`, `enable_pattern` + **كل ألوان الوضع الداكن** (`*_dark`) |
| **general** | 7 / 7 | `enable_fonts`, `font_name`, `enable_harir`, `arabic_numbers`, `display_copyright`, `content_copyright` |
| **dark mode** (ضمن colors) | — | `dark_mode`, `default_mode`, `dark_mode_switcher` |
| **header** | 48 / 52 | اللوجو (`header_logo_width/height`, `reversed_logo`), `trans_header`, `centered_logo`, القائمة الجانبية, التوب-بار, التعريب (`header_localization_*`), وضع الثيم |
| **promo** | 6 / 6 | شريط الإعلان: `promotion_text`, `promo_link`, `pormotion_bg`, `fixed_promotion` |
| **home** | 30 / 32 | أنماط عناوين الأقسام (`title_style_preview_*` ~19 نمط), `enhanced_products_slider`, `enable_second_reviews`, `square_photos_mosaic` |
| **product_card** | 43 / 45 | `card_layout`, `product_image_height`, `products_per_row`, `rounded_cards`, badges, countdown, أزرار الموبايل, hover/zoom |
| **product** | 32 / 37 | صور الخيارات, `thumbs_bottom`, الأسعار, الأقساط, المميزات, السايدبار, `show_sticky_product` |
| **categories** | 8 / 9 | `show_cat_banner`, `banner_image`, `cats_content`, `show_sub_cats` |
| **cart** | 14 / 14 | سلة الـdrawer كاملة: `enable_cart_drawer`, `open_drawer_on_add`, `cart_banner_*` |
| **footer** | 32 / 33 | اللوجو, الـbottom nav, الألوان, النشرة البريدية, السوشيال |
| **popup** | 16 / 16 | بوب-أب الخصم + الشريط العائم (`discount_popup_*`) |
| **loading** | 10 / 10 | شاشة التحميل كاملة (`enable_loading`, `loading_logo`, ...) |
| **floating** | 14 / 14 | أزرار عائمة: واتساب (`wa_*`), اتصال (`phone_*`), scroll-top |

**ملاحظة مهمة:** إضافة الإعداد لـ`twilight.json` خطوة واحدة؛ الخطوة التانية **توصيله بالكود** (الكومبوننت/الـlayout اللي بيستهلكه). حاليًا حتى من الـ18 الموجودين، **9 بس متأكد إنهم مستهلكين** في الكود.

**ترتيب مقترح داخل P0:**
1. `colors` + `dark mode` (أعلى أثر بصري، وأي تاجر بيغيّرهم أول حاجة).
2. `general` (الخطوط).
3. `header` + `footer` (ظاهرين في كل صفحة).
4. `product_card` + `product` (قلب المتجر).
5. `cart` (drawer) + `promo` + `floating`.
6. `popup` + `loading` + `categories` + باقي `home`.

---

## P1 — باجات قراءة الحقول الخام (محتملة)

9 مكوّنات بتقرأ `data.title/description` أو `.image` **من غير** `collectionField`/`pickLang` — نفس نوع الباج اللي اتصلح في `EnhancedSlider` / `EnhancedSquareBanners` / `SliderProductsWithHeader` (بيبان كـ`url(undefined)` أو `[object Object]` في المحرر/المعاينة). **محتاجين مراجعة فردية للتأكيد** (مش كلهم أكيد باج):

- `Blog.tsx` · `DoubleBanner.tsx` · `ThreeBanners.tsx` · `PhotosSlider.tsx` · `PhotosSliderWithText.tsx`
- `FeaturedProducts.tsx` · `FixedProducts.tsx` · `MainLinks.tsx` · `TireFilter.tsx`

> الأعلى شبهة: مكوّنات البنرات/الصور (`DoubleBanner`, `ThreeBanners`, `PhotosSlider*`) لأنها نفس نمط اللي اتكسر قبل كده.

---

## P2 — فجوات حقول المكوّنات

مكوّنين ناقصهم حقل واحد مقارنة بالتويج:
- `home.blog` — React: 4 حقول · Twig: 5
- `home.enhanced-slider` — React: 5 · Twig: 6

(4 مكوّنات موجودة في الرياكت بس مش في التويج — إضافات/إعادة تسمية، مش فجوات: `featured-products`, `featured-products-special-offer`, `featured-products-special-product`, `photos-slider-with-text`.)

---

## P3 — الترجمات (locales)

- التويج: 127 نص · الرياكت: 105 نص.
- **98 مفتاح ترجمة في التويج مش موجود بنفس المسار في الرياكت.**
- أمثلة على الناقص: `blocks.footer.newsletter*`, `blocks.catalog.view_grid/view_list/show_filters`, `pages.wishlist.share*`, `blocks.header.*`, `blocks.home.discover_now`.
- بعضها ممكن يكون المحرّك بيوفّره، فمحتاج تأكيد أثناء التنفيذ.

---

## ✅ المحاور السليمة (مش محتاجة شغل)

- **الصفحات:** الرياكت فيه 24 route بتغطّي كل صفحات التويج (index, product, cart, brands, blog + فروعه, loyalty, testimonials, thank-you, الحساب بكل تبويباته) + زيادة.
- **المكوّنات:** 53 (React) مقابل 49 (Twig) — كل مكوّنات التويج موجودة.

---

## طريقة إعادة توليد الأرقام

```bash
# عدد الإعدادات
node -e 'const j=p=>JSON.parse(require("fs").readFileSync(p,"utf8")).settings||[]; \
  const nn=s=>s.filter(x=>x.id&&!/^(static|sub_|section_)/.test(x.id)); \
  console.log("React",nn(j("triple_react/twilight.json")).length,"Twig",nn(j("triple_twig/twilight.json")).length)'
```
