import * as express from "express";
import Database from "../Database";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const sezon = String(req.query.sezon);
  const limit = Number(req.query.limit);
  const offset = Number(req.query.offset);
  const accountType = req.query.accountType;

  let totalRowsData, data;

  if (accountType === "KIEROWNIK") {
    data = await Database.raw(
      'SELECT s.id, s.rodzaj_sprzetu, s.przeznaczenie, s.cecha_1_label,s.cecha_1_value, s.cecha_2_label,s.cecha_2_value, s.cecha_3_label,s.cecha_3_value, s.cecha_4_label,s.cecha_4_value, s.cena_wypozyczenia_dzien FROM sprzet s JOIN rodzaj_sprzetu r ON (s.rodzaj_sprzetu=r.nazwa) WHERE s.blokada!="usuniety" AND r.rodzaj_sezonu=? LIMIT ? OFFSET ?;',
      [sezon, limit, offset]
    );
    totalRowsData = await Database.raw(
      'SELECT COUNT(*) as totalRows FROM sprzet s JOIN rodzaj_sprzetu r ON (s.rodzaj_sprzetu=r.nazwa) WHERE s.blokada!="usuniety" AND r.rodzaj_sezonu=?;',
      [sezon]
    );
  } else if (accountType === "SERWISANT") {
    data = await Database.raw(
      'SELECT s.id, s.rodzaj_sprzetu, s.przeznaczenie, s.cecha_1_label,s.cecha_1_value, s.cecha_2_label,s.cecha_2_value, s.cecha_3_label,s.cecha_3_value, s.cecha_4_label,s.cecha_4_value, s.cena_wypozyczenia_dzien FROM sprzet s JOIN rodzaj_sprzetu r ON s.rodzaj_sprzetu=r.nazwa JOIN wypozyczony_sprzet wp ON wp.sprzet_id = s.id JOIN wypozyczenie w ON w.id = wp.wypozyczenie_id AND w.koniec > (SELECT MAX(n.data) FROM naprawa n WHERE s.id = n.sprzet_id) WHERE s.blokada!="usuniety" AND r.rodzaj_sezonu=? GROUP BY s.id HAVING COUNT(w.id) > 4 LIMIT ? OFFSET ?;',
      [sezon, limit, offset]
    );
    totalRowsData = await Database.raw(
      'SELECT COUNT(*) AS totalRows FROM (SELECT COUNT(s.id) as totalRows FROM sprzet s JOIN rodzaj_sprzetu r ON s.rodzaj_sprzetu=r.nazwa JOIN wypozyczony_sprzet wp ON wp.sprzet_id = s.id JOIN wypozyczenie w ON w.id = wp.wypozyczenie_id AND w.koniec > (SELECT MAX(n.data) FROM naprawa n WHERE s.id = n.sprzet_id) WHERE s.blokada!="usuniety" AND r.rodzaj_sezonu=? GROUP BY s.id HAVING COUNT(w.id) > 4) x',
      [sezon]
    );
  } else {
    // KLIENT
    data = await Database.raw(
      'SELECT s.id, s.rodzaj_sprzetu, s.przeznaczenie, s.cecha_1_label,s.cecha_1_value, s.cecha_2_label,s.cecha_2_value, s.cecha_3_label,s.cecha_3_value, s.cecha_4_label,s.cecha_4_value, s.cena_wypozyczenia_dzien FROM sprzet s JOIN rodzaj_sprzetu r ON (s.rodzaj_sprzetu=r.nazwa) WHERE s.blokada="dostepny" AND r.rodzaj_sezonu=? LIMIT ? OFFSET ?;',
      [sezon, limit, offset]
    );
    totalRowsData = await Database.raw(
      'SELECT COUNT(*) as totalRows FROM sprzet s JOIN rodzaj_sprzetu r ON (s.rodzaj_sprzetu=r.nazwa) WHERE s.blokada="dostepny" AND r.rodzaj_sezonu=?;',
      [sezon]
    );
  }

  res.status(200).json({ rows: data[0], ...totalRowsData[0][0] });
});

router.get("/rodzaj", async (req, res, next) => {
  try {
    const data = await Database.raw(
      "SELECT `nazwa`, `rodzaj_sezonu` FROM `rodzaj_sprzetu` WHERE 1;"
    );

    res.status(200).send(data[0]);
  } catch (error) {
    res.status(400).end();
  }
});

router.get("/:id", async (req, res, next) => {
  const id = req.params.id;

  const data = await Database.raw(
    "SELECT s.id,s.wartosc_sprzetu, s.rocznik, s.blokada, s.rodzaj_sprzetu, s.przeznaczenie, s.cecha_1_label,s.cecha_1_value, s.cecha_2_label,s.cecha_2_value, s.cecha_3_label,s.cecha_3_value, s.cecha_4_label,s.cecha_4_value, s.cena_wypozyczenia_dzien, r.nazwa, r.rodzaj_sezonu FROM sprzet s JOIN rodzaj_sprzetu r ON s.rodzaj_sprzetu = r.nazwa  WHERE s.id = ?",
    [id]
  );
  const extraData = await Database.raw(`select (select count(*) from wypozyczony_sprzet where sprzet_id = ${id}) as 'ilosc_wypozyczen',
  (select count(*) from naprawa where sprzet_id = ${id}) as 'ilosc_napraw',
  (select GROUP_CONCAT(CONCAT("[", LEFT(naprawa.data, 10), "] - ", naprawa.opis) SEPARATOR '\n') FROM naprawa WHERE sprzet_id = ${id}) as "opis_napraw";`);

  // ({ ...data[0][0] } = extraData[0][0]);

  if (data[0].length)
    res.status(200).json({ ...data[0][0], ...extraData[0][0] });
  else res.status(404).end();
});

router.post("/", async (req, res, next) => {
  const rodzajSprzetu: string = req.body.rodzajSprzetu;
  const przeznaczenie: string = req.body.przeznaczenie;
  const cecha_1_label: string = req.body.cecha_1_label;
  const cecha_1_value: string = req.body.cecha_1_value;
  const cecha_2_label: string = req.body.cecha_2_label;
  const cecha_2_value: string = req.body.cecha_2_value;
  const cecha_3_label: string = req.body.cecha_3_label;
  const cecha_3_value: string = req.body.cecha_3_value;
  const cecha_4_label: string = req.body.cecha_4_label;
  const cecha_4_value: string = req.body.cecha_4_value;
  const cena: number = req.body.cena;
  const rocznik: string = req.body.rocznik;
  const wartoscSprzetu: number = req.body.wartoscSprzetu;

  try {
    const data = await Database.raw(
      'INSERT INTO sprzet(rodzaj_sprzetu,przeznaczenie,cecha_1_label,cecha_1_value,cecha_2_label,cecha_2_value,cecha_3_label,cecha_3_value,cecha_4_label,cecha_4_value,cena_wypozyczenia_dzien,blokada,rocznik,wartosc_sprzetu) values (?,?,?,?,?,?,?,?,?,?,?,"dostepny",?,?);',
      [
        rodzajSprzetu,
        przeznaczenie,
        cecha_1_label,
        cecha_1_value,
        cecha_2_label,
        cecha_2_value,
        cecha_3_label,
        cecha_3_value,
        cecha_4_label,
        cecha_4_value,
        cena,
        rocznik,
        wartoscSprzetu,
      ]
    );

    res.status(201).send({ id: data[0].insertId });
  } catch (error) {
    res.status(400).end();
  }
});

router.post("/:id", async (req, res, next) => {
  const id: string = req.params.id;
  const rodzajSprzetu: string = req.body.rodzajSprzetu;
  const przeznaczenie: string = req.body.przeznaczenie;
  const cecha_1_label: string = req.body.cecha_1_label;
  const cecha_1_value: string = req.body.cecha_1_value;
  const cecha_2_label: string = req.body.cecha_2_label;
  const cecha_2_value: string = req.body.cecha_2_value;
  const cecha_3_label: string = req.body.cecha_3_label;
  const cecha_3_value: string = req.body.cecha_3_value;
  const cecha_4_label: string = req.body.cecha_4_label;
  const cecha_4_value: string = req.body.cecha_4_value;
  const cena: number = req.body.cena;
  const rocznik: string = req.body.rocznik;
  const wartoscSprzetu: number = req.body.wartoscSprzetu;
  const blokada: number = req.body.blokada;
  try {
    const data = await Database.raw(
      "UPDATE `sprzet` SET `rodzaj_sprzetu`=?,`przeznaczenie`=?,`cecha_1_label`=?,`cecha_1_value`=?,`cecha_2_label`=?,`cecha_2_value`=?,`cecha_3_label`=?,`cecha_3_value`=?,`cecha_4_label`=?,`cecha_4_value`=?,`cena_wypozyczenia_dzien`=?,`rocznik`=?,`wartosc_sprzetu`=?, `blokada`=? WHERE `id` = ?;",
      [
        rodzajSprzetu,
        przeznaczenie,
        cecha_1_label,
        cecha_1_value,
        cecha_2_label,
        cecha_2_value,
        cecha_3_label,
        cecha_3_value,
        cecha_4_label,
        cecha_4_value,
        cena,
        rocznik,
        wartoscSprzetu,
        blokada,
        id,
      ]
    );

    if (data[0].affectedRows) res.status(201).end();
    else res.status(400).end();
  } catch (error) {
    res.status(400).end();
  }
});

router.post("/rodzaj", async (req, res, next) => {
  const nazwa: string = req.body.nazwa;
  const rodzajSezonu: string = req.body.rodzajSezonu;

  try {
    const data = await Database.raw(
      "INSERT INTO rodzaj_sprzetu (nazwa,rodzaj_sezonu) VALUES (?, ?);",
      [nazwa, rodzajSezonu]
    );

    res.status(201).send({ id: data[0].insertId });
  } catch (error) {
    res.status(400).end();
  }
});

router.delete("/:id", async (req, res, next) => {
  const id = req.params.id;

  try {
    const data = await Database.raw(
      'UPDATE `sprzet` SET `blokada` = "usuniety" WHERE `id` = ?',
      [id]
    );

    if (data[0].affectedRows) res.status(201).end();
    else res.status(400).end();
  } catch (error) {
    res.status(400).end();
  }
});

export default router;
