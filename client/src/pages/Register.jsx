import {useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {api} from '../services/api.js';
export default function Register(){const [form,setForm]=useState({name:'',email:'',password:''});const [error,setError]=useState('');const go=useNavigate();const submit=async(e)=>{e.preventDefault();try{const r=await api.post('/auth/register',form);localStorage.setItem('token',r.data.token);go('/');}catch(x){setError(x.response?.data?.error||'Unable to register.')}};return <main><h1>Create account</h1><form onSubmit={submit}>{['name','email','password'].map(field=><input key={field} required type={field==='password'?'password':'text'} placeholder={field[0].toUpperCase()+field.slice(1)} value={form[field]} onChange={e=>setForm({...form,[field]:e.target.value})}/>)}<button>Register</button><p>{error}</p></form><Link to="/login">Already registered? Log in</Link></main>}
import React from 'react';
