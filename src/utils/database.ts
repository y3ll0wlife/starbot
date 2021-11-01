import { Database } from "sqlite3";

export async function get(db: Database, sql: string, params: any[] = []) {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err: Error, result: any) => {
			if (err) {
				console.error("Error running sql: " + sql);
				console.error(err);
				reject(err);
			} else resolve(result);
		});
	});
}
