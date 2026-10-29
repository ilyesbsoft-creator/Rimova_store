
import {
  findFirstActiveDeliveryCompany,
  findActiveWilayas,
  findActiveCommunes,
  findActiveDeliveryOffices,
  findActiveHomeDeliveryRates,
  findActiveOfficeDeliveryRates,
} from "./delivery.repository";

export async function getDeliveryOptions() {
  // 1. اختيار أول شركة توصيل نشطة
  const company = await findFirstActiveDeliveryCompany();

  if (!company) {
    return null;
  }

  // 2. جلب الولايات ومعلومات التوصيل بالتوازي
  const [
    wilayas,
    offices,
    homeRates,
    officeRates,
  ] = await Promise.all([
    findActiveWilayas(),
    findActiveDeliveryOffices(company.id),
    findActiveHomeDeliveryRates(company.id),
    findActiveOfficeDeliveryRates(company.id),
  ]);

  // 3. جلب البلديات التابعة للولايات النشطة
  const communes = await findActiveCommunes(
    wilayas.map((wilaya) => wilaya.id)
  );

  // 4. تجهيز خرائط الأسعار والمكاتب لتسهيل الربط
  const officesByCommune = new Map<string, typeof offices>();
  const homeRatesByCommune = new Map(
    homeRates.map((rate) => [
      rate.commune_id,
      Number(rate.price),
    ])
  );
  const officeRatesByCommune = new Map(
    officeRates.map((rate) => [
      rate.commune_id,
      Number(rate.price),
    ])
  );

  for (const office of offices) {
    const communeOffices =
      officesByCommune.get(office.commune_id) ?? [];

    communeOffices.push(office);
    officesByCommune.set(office.commune_id, communeOffices);
  }

  // 5. تجميع البلديات تحت الولايات التابعة لها
  const wilayasWithCommunes = wilayas.map((wilaya) => ({
    ...wilaya,

    communes: communes
      .filter((commune) => commune.wilaya_id === wilaya.id)
      .map((commune) => ({
        id: commune.id,
        code: commune.code,
        name: commune.name,

        delivery_offices:
          officesByCommune.get(commune.id) ?? [],

        home_delivery_price:
          homeRatesByCommune.get(commune.id) ?? null,

        office_delivery_price:
          officeRatesByCommune.get(commune.id) ?? null,
      })),
  }));

  // 6. إرجاع بيانات شركة التوصيل وخياراتها
  return {
    company,
    wilayas: wilayasWithCommunes,
  };
}
