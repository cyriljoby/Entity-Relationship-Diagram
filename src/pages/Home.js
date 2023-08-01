import { Link } from "react-router-dom"
const Home = ()=>{
    return(
        <div>
            <p>Home</p>
            <Link to ={`/erd/FinancialServices`} >Financial Services</Link><br/>
            <Link to ='/erd'>Healthcare</Link><br/>
            <Link to ='/erd'>Marketing</Link><br/>
            <Link to ='/erd'>Sustainability</Link><br/>
        </div>)
        
}
export default Home