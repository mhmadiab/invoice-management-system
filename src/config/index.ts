import dotenv from 'dotenv'
import path from 'path'

dotenv.config({path : path.join(__dirname , '../../.env')})

export default{
    isDev : process.env.NODE_ENV == "development", 
    APP_ORIGIN: process.env.APP_ORIGIN, 
    auth: {
        JWTSecrete : process.env.AUTH_JWT_SECRET, 
        ACCESS_SECONDS : process.env.ACCESS_SECONDS, 
        SESSION_SECONDS: process.env.SESSION_SECONDS
    },

    db:{
        DATABASE_URL : process.env.DATABASE_URL
    }

}