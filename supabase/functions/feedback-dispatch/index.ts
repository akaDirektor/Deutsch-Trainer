import {createDispatcher} from './handler.mjs';
Deno.serve(createDispatcher({env:(name:string)=>Deno.env.get(name)}));
