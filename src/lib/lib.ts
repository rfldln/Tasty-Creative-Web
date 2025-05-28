// This file contains the library functions for the app.
// It is a good practice to keep the library functions in a separate file

export const TIMEZONES = [
  { name: "PST" },
  { name: "MST" },
  { name: "CST" },
  { name: "EST" },
];
export const POSITIONS = ["LEFT", "RIGHT", "BOTTOM"];

export const DISPLAY_FIELDS: { label: string; key: string }[] = [
  { label: "Status", key: "Status" },
  { label: "Launch Date", key: "Launch Date" },
  { label: "Referrer Name", key: "Referrer Name" },
  { label: "Personality Type", key: "Personality Type" },
  { label: "Common Terms", key: "Common Terms" },
  { label: "Common Emojis", key: "Common Emojis" },
  { label: "Instagram", key: "Main Instagram @" },
  { label: "Twitter", key: "Main Twitter @" },
  { label: "TikTok", key: "Main TikTok @" },
  { label: "Chatting Managers", key: "Profile Link" },
];

export const MODELS_FINISHED_WEEKS_IDS = {
  Amber: {
    free: "1cdQC5Xtr9RqnG35TeGoHwLpAWSrSMl4o2dSK3ll-iMU",
    paid: "1G__cbqTNMOHotvlg_EskZftzUlgitnkOLXbSgusWqUM",
  },
  Autumn: {
    free: "1aFTILiGg21X0TY6KDAt0g1jj3_G9wM60oBeVcj5ZS-4",
    paid: "1SMYxs5Su-zl1rtMBTM17jsGjHnD4ELPlIIY_7QJZzSk",
  },
  Bri: {
    free: "1US1VXehRjVReaiJYvO9T1IXXL2O56RlECLwbC0KNuQY",
    paid: "1zbxah0gY5wfWuROAcfvoBNXkpelNPSq7cHI-TpWVSks",
  },
  Alaya: {
    paid: "1fJpgWD07X-x2XDLhL9FYXz6rG1bFK5fnkm0KlPoxxYk",
  },
  Ava: {
    free: "1qaktwfCcEDHJekdC3fbn_CeZDEHmmAv5eL8pefyu33Q",
    paid: "14pDaxA7ES6G0yDjfgNsqtklQt4u2u9hGde7hEPCxlIQ",
  },
  "Dan Dangler": {
    free: "1CyNvwtu38kODbfGvmtdAsRLWWtsf17Yz7x16j-Zb6VE",
    paid: "1mN_QQT_bXOP7LcSW8Bnf2yfvEfNIED7tpg5MIvcvmK0",
  },
  Lala: {
    free: "1YR1rJ_ldiOvYdZl6T_ij1NWb0ZEvp6WTAVENC555JAo",
    paid: "1YLfmeGIeLoR01NicXTJt8pzo7Ey6EErtzbGHiglEJ2w",
  },
  "Nicole Aniston": {
    free: "1Jcou07ky8NeiWhNPpSn-L-Afzopa5vQ1ktNtdTV8d8g",
    paid: "18McKNuNZ-dj_mTWJXdLt6_RTXFsj_5IlnYaP8M2jBhE",
  },
  Essie: {
    free: "1jBO65eDT5mUH64C11mPpdA1HhbQE2ANFYoQvqtmFZpA",
    paid: "1quDIFqCRenioDA5EmcSCXkwsSOMBIZSICyfjgerhm1U",
  },
  Kait: {
    free: "1v7k8y8QexJts0X4Rmsu1V2O30_OTef2iKaVqgKAfJOY",
    paid: "1MXJ_b4KXdwEfvR-psuRl_pwb_i2HPsBzjUQPNPGFOSE",
  },
  Salah: {
    free: "190bmfJ6FgAaS_2F8-aM202TKGLKDn_0przypPQzlW8c",
    paid: "1aFWpDQYn1wsFAYrCSuHbHdIIv1T0Mf5yTguZjJ_diMg",
  },
  "Victoria (V)": {
    free: "1OmdqwUJG3NzOn5kiaQTzlJ-1pTKOJEP_F7yS7tve5bI",
    paid: "1dDlAK_-wsNuGMdP-7YQZXS_h9JzKGULrEiOqIiGGJzU",
  },
  Bronwin: {
    free: "17d3CK5LDdvPrL7dSJXidV12EOf-g7IDaNkfvw6Q192s",
    paid: "1CJv6EN8y5Gow0tBcze5SulXVtsEzj7z3Od3SSsQLuEo",
  },
  Jaileen: {
    free: "18TCGNt3XYI5NPQS3z5JW0j8Naic4r7CQ6X88mkuU-fc",
    paid: "1OmsN3vqRiYBgmZw8A40Sjj__QSrNG-Umt5hGMkA9zsk",
  },
  Mel: {
    free: "1AzqXPXfrT5XUXqUvOonvt1keG3iOGQ2PsU_fK3fEHLw",
  },
  MJ: {
    free: "1UNolxMkJK1y6Zpn9DyYELXV4bXKP8ZyjtQe5S_ip7wU",
    paid: "1CMNED3Dh9zAQMQ64ySZtNuxc_dOaIjg_Ub3ahChNSvI",
  },
  SINATRA: {
    free: "1MioEz1q3hl_KcZ5TMMhNjbCmhkjUWQ3IX5PDeLhWqcI",
  },
  Tita: {
    paid: "1HfKRGATtyqTQ-CzhB1kNxCJgHv8xPjxxzYKxDyMfl2s",
  },
  Emmie: {
    free: "1LsltiF9Adqc6kyxdt2y9pH8Btsnj9NdT7gV9GOpirWI",
    paid: "1KFwV0HJ01-LRPyNRBI02VDeftCT3RCea0kCoG0HYaVo",
  },
  Gabrielle: {
    free: "1KCt-Um-Dmw2gqbD9nz-uXnBANXHXEjLy2A-Q7OEHOqU",
    paid: "1A_gzzgMEA_U12GGBKbA1v6ZfgS8XX1SYo3llu5BWcc8",
  },
  "Ivy Wolfe": {
    paid: "1SBv7k7pjZApWwH3IqxyawywqdpnQEw1z49ILRS1-nEA",
  },
  "Ivy Wren": {
    free: "1H7-BlZ6mp3WBGI7hLaG4PnPsQoGLTDDf819BMJ9XCd0",
    paid: "1sFcyIPU_N6nVpfvZe-50Zxfb85XmHdd80v6RAn4nZMg",
  },
  Tayy: {
    paid: "1v-oqXmh-psE4yazSvSxZdFQnoVu7NteFY_ke6eDRe0s",
  },
  Angel: {
    paid: "15YPr04pc9kPj0Iy2NhC38zSHoyIutlnai_Yr2354r6Y",
  },
  Angela: {
    free: "1dlRRQ-uWHmdRPMeWSqEFaH36_axcCOTCIHKvzBjifXs",
    paid: "12D8KnEKmx5Qy6bXvsDBI6rB88Kt_Fvsx2km1IrfQmYY",
  },
  Forrest: {
    paid: "1fSN6P_DSL4c_yGH511QnuGiGlgHstmC0T4rL5F2t_1w",
  },
  Sirena: {
    free: "1pM7hZxzALNLB5XxJNKeeiQl0yOSNd74vG1A4AMeqjlc",
    paid: "16tM2U30Ww3in7_1ZyJmVdfw_3xTZuLwYtyTSvsXKLjs",
  },
  Coco: {
    free: "1lWtS-Pq07MhXGIRPbTu9FXFgDqmrrOWYUcdfIz5o9jE",
    paid: "1fb-cGIwTZ4PMZGPRURXweMLFbB1JuI4rJXDJmtQt9OQ",
  },
  Colby: {
    free: "1Ux2chbeZneY5iunTFIHUmwKIWB06gIy7TIk0aobthK4",
  },
  Cora: {
    free: "1kl_4cpIVH8qWvKcL8GXY9Dp2vHjO5MCXVj_K8tb767k",
    paid: "1WYaEdxspMTBxcTAZNErynTsREOsmDn5PmfwyTZ5Yv7M",
  },
  Jaid: {
    free: "1RmS1oM93jeHdxuUY9K23Hdc3CnApNphs-Iy-MOrjyBU",
  },
  Kelly: {
    free: "13DcQqlk2pgDbu0oxv3Qr1cty_cjs6bgLE2C88wAltxo",
    paid: "1bIYaj3_EcB4x1P4Df3usxfJrX9_Gvs413ZUmuLhDBSk",
  },
  "Emily Ray": {
    free: "1Fvqdcq_pwKP8nky_tZEPyJPDFUnE5BHboef_QPsZTho",
    paid: "1zzgmKcSjmyg-ammOuDl1Fw9-P46l-cfRbh722CvZnto",
  },
  "Kenzie Anne": {
    free: "1EbqKgO_NaeDNEgECaDKka7f5mjNHlwzHsPlUmNZ6Uws",
  },
  Sharna: {
    free: "18CPwKM18smrPcyKt7x0Z7ePhTJvW7DM9c-u2IOCPtw4",
    paid: "1XyJ295ryn23VQjN-w5nn9Mg1xVoZHglluO0bCUEQQ7c",
  },
  Sage: {
    free: "12e0RpThgOP171i9dhHbDPk4n8whsv2eh80EcKKERGZc",
    paid: "1mZsHyn1y8Q0GxBPN3xfynb6oalvIk03cqwy72PFTUi8",
  },
  Sky: {
    free: "14yaTTi_BJUT0bSbPDCDbL6ELyexRKJqKKYbYY1olHgg",
    paid: "1-4d7fu0piHgUYh7LwR0DrDcWVwHbdq5V02QnsKQama4",
  },
  Tiauna: {
    free: "1hkCSSTi4Ho-sET4DZwxVXQ3HpKiDqXEI58DWpRv9uhI",
  },
  Laila: {
    paid: "1yet0NApBso3iNJWYWWxNI22Ribky6azX7LocMJYLeKc",
  },
  Michelle: {
    paid: "1z4LWRP0e5oZhLis6VVBLmNu8CGoLQmr9lPd1jclVySk",
  },
  Oakly: {
    free: "17ojki9OSf93X4orA787G30TsDFGhO43OV26DE6SuLRY",
    paid: "19upOq3B7guEcK044JAomM9xpNEcKzf43kpVRL11P7nI",
  },
  Paige: {
    paid: "1n7CZKFseXi8D7p0SEApqSob4fWLFuqd8O0_0jTnaeW0",
  },
  Razz: {
    free: "1IoLAClBot_sdroz_KoHo0KE6mClQfjkNtBKFfjkNtBKFfa2KU8M",
  },
};
