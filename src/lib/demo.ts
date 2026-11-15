import type { AppData, DailyRecord, Dish, Restaurant } from "../types";
import { DATA_VERSION } from "../types";
import { uid } from "./id";
import { addDaysISO, todayISO } from "./date";
const KEY = "foodwise-ph:data:v1";
export function emptyData(): AppData {
  return {version:DATA_VERSION, restaurant:makeRestaurant("Your restaurant", ""), dishes:[], records:[], preparationPlans:[], settings:{historicalPeriod:7,safetyAllowance:0.1}};
}
function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") return emptyData();
  const data = raw as Partial<AppData>;
  const dishes = Array.isArray(data.dishes) ? data.dishes.map(d => ({...d, ingredients: Array.isArray(d.ingredients) ? d.ingredients : []})) : [];
  const result: AppData = {...emptyData(), ...data, version:DATA_VERSION, dishes, records: Array.isArray(data.records) ? data.records : [], preparationPlans: Array.isArray(data.preparationPlans) ? data.preparationPlans : [], settings:{historicalPeriod: data.settings?.historicalPeriod ?? 7, safetyAllowance:data.settings?.safetyAllowance ?? 0.1}};
  return result;
}
export function loadData(): AppData {
  try { const raw = localStorage.getItem(KEY); return raw ? migrate(JSON.parse(raw)) : buildDemoData(); } catch { return emptyData(); }
}
export function saveData(data: AppData): void { try {localStorage.setItem(KEY,JSON.stringify(data));} catch { /* Session state remains available if browser storage is full. */ } }
export function clearData(): void {try {localStorage.removeItem(KEY);} catch { /* No stored data to remove. */ }}
export function makeRestaurant(name: string,type: Restaurant["type"]): Restaurant {return {id:uid("rest"),name:name.trim(),type,createdAt:new Date().toISOString()};}
export function buildDemoData(): AppData {
  const now = new Date().toISOString();
  const specs: {id:string; name:string; category:Dish["category"]; image:string; sales:number[]; ingredients:string[]}[] = [
    {id:"dish_calamares",name:"Calamares",category:"Appetizer",image:"calamares",sales:[12,8,10,11,9],ingredients:["Fresh Squid","All-purpose flour","Cornstarch","Eggs","Breadcrumbs","Salt & pepper","Garlic powder","Cooking oil","Spicy dip","Lemon"]},
    {id:"dish_fried_chicken",name:"Fried Chicken",category:"Main Course",image:"fried-chicken",sales:[41,47,36,44,42],ingredients:["Chicken pieces","All-purpose flour","Cornstarch","Eggs","Salt & pepper","Garlic powder","Cooking oil","Gravy mix"]},
    {id:"dish_mushroom_soup",name:"Creamy Mushroom Soup",category:"Soup",image:"mushroom-soup",sales:[18,22,11,16,18],ingredients:["Fresh mushrooms","Butter","Garlic","Onion","All-purpose flour","Fresh milk","All-purpose cream","Chicken stock","Salt & pepper"]},
    {id:"dish_potato_salad",name:"German Potato Salad",category:"Salad",image:"potato-salad",sales:[23,18,28,21,25],ingredients:["Potatoes","Bacon","Onion","Vinegar","Mustard","Cooking oil","Salt & pepper","Parsley"]},
    {id:"dish_affogato",name:"Affogato",category:"Dessert",image:"affogato",sales:[21,16,11,18,14],ingredients:["Vanilla ice cream","Espresso"]},
    {id:"dish_watermelon_smoothie",name:"Watermelon Smoothie",category:"Beverage",image:"watermelon-smoothie",sales:[16,18,16,20,15],ingredients:["Fresh watermelon","Ice","Sugar","Milk"]},
  ];
  const dishes: Dish[] = specs.map(s => ({id:s.id,name:s.name,category:s.category,image:`dishes/${s.image}.jpg`,ingredients:s.ingredients,servingUnit:"serving",costPerServing:null,sellingPrice:null,status:"active",createdAt:now,updatedAt:now}));
  const records: DailyRecord[] = specs.flatMap(s => s.sales.map((sold,index) => {
    const date = addDaysISO(todayISO(), index-5);
    return {id:`sample_${s.id}_${date}`,dishId:s.id,date,prepared:null,sold,discarded:null,wasOffered:true,notes:index < 3 ? "Original supplied sales." : "Illustrative demo sales for Day " + (index+1) + ".",createdAt:now,updatedAt:now};
  }));
  return {version:DATA_VERSION,restaurant:{id:"rest_demo_kusina",name:"Kusina ni Maria",type:"Casual Dining",createdAt:now},dishes,records,preparationPlans:[],settings:{historicalPeriod:3,safetyAllowance:0.1}};
}
