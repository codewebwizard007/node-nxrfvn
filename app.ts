import { config } from "dotenv"
import { resolve } from "path"
import "./src/v1/setup/express-js-req-extention"

config({
	path: resolve(process.cwd(), `${process.env.NODE_ENV}.env`)
})

import rootClientRouter from "./src/v1/routes"
import { expressErrorHandler } from "./src/v1/setup/errorHandling/expressErrorHandling"
import app from "./src/v1/setup/server"
import rootAdminRouter from "./src/v1/routes/admin"

app.get("", (req, res, next) => {
	return res.send(
		`
	<h1 style="text-align:center"> ⚡⚡ STATUS :: RUNNING 🏃‍♂️🏃‍♀️ </h1>
	`
	)
})
//
app.use("/v1/admin", rootAdminRouter)
app.use("/v1", rootClientRouter)

// Express error handler
app.use(expressErrorHandler)
