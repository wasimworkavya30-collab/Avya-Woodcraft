# Admin API contract (used by the React frontend)

All routes need `Authorization: Bearer <admin JWT>`. JSON is camelCase. Dates are `YYYY-MM-DD`, months `YYYY-MM`.
The existing employee endpoints keep their v1 shape (`/api/employee/*`) and get the additions listed at the end.

Status: **frontend done, backend for these routes is the next step.**

## Production (most important for the client)
- `GET /api/admin/orders` → `{ orders, employees, products, live }`
  - order: `{ id, label, customer, qty, start, photo, productId, hours, peopleCount, today:[{employeeId,hours}], cost:{total,price,labour}|null, labourActual, stages:[{id,name,days,start,done,assigned:[employeeId]}] }`
  - `hours` / `peopleCount` / `labourActual` come from work entries linked to the order (all time, so completed items keep their history). `labourActual` = Σ hours × employee hourly rate.
  - live: `[{employeeId,name,photo,task,item,hours,working}]` for people present today.
- `GET /api/admin/orders/:id/work` → `{ people:[{employeeId,name,photo,days,hours,cost}], entries:[{id,date,employeeId,name,task,hours,note}] }`
- `POST /api/admin/orders/:id/work` `{employeeId,date,hours,task}` (admin adds a missing entry)
- `POST /api/admin/orders` `{label,customer,qty,start}` (creates 7 standard stages); `PATCH /orders/:id` `{label,customer,qty,start,productId}`; `DELETE /orders/:id`
- `POST /orders/:id/stages` `{name,days}`; `PATCH /stages/:id` `{name,days,start,done}`; `DELETE /stages/:id`
- `POST /stages/:id/people` `{employeeId}`; `DELETE /stages/:id/people/:employeeId`
- An item is "completed" when every stage has a `done` date. State and delay are computed in the frontend (`ordInfo`).

## Costing
- `GET /products` → `{ products:[{id,name,price,photo,runs:[orderId],lines:[{id,kind,name,qty,unit,rate,photo}]}], inventory:[{id,name,unit,rate}], history:[{id,label,customer,qty,doneAt,photo,hours,peopleCount,cost:{total,price,labour}|null,labourActual}] }`
  - `history` = completed orders. `kind` is `material|labour|other`.
- `POST /products` `{name}`; `PATCH /products/:id` `{name,price}`; `POST /products/:id/photo` `{photo}`; `DELETE /products/:id`
- `POST /products/:id/lines` `{kind,name,qty,unit,rate,inventoryId?}`; `PATCH /lines/:id`; `POST /lines/:id/photo`; `DELETE /lines/:id`

## Overview, counts
- `GET /counts` → `{approvals,leave,requests}`
- `GET /overview` → `{ today, counts, present, onLeave, notIn, total, payroll:{month,amount}, teams:[{id,present,total}], employees:[{id,name,role,team,isLead,photo,status,checkInAt,distance}], blocked, pettyBalance, pettyLow, lowStock }` (`status`: working|done|leave|off|out)

## People
- `GET /employees?all=1` → `{employees:[{id,code,name,role,team,isLead,isManager,hourlyRate,photo,active}]}`
- `POST /employees` `{name,role,team,hourlyRate,pin}`; `PATCH /employees/:id` `{name,role,team,hourlyRate,isLead,active}`; `POST /employees/:id/photo` `{photo}`
- `GET /teams` → `{ceo:{name,photo}, members:[…employee + status]}`
- `GET /employees/:id/month?month=` → `{employee, days:{date:{units,dayType,hours}}, totals:{units,approvedHours,pendingHours,gross,deduction,net}, advances, outstanding}`

## Attendance
- `GET /attendance/pending` → `{rows:[{id,name,photo,date,checkInAt,checkOutAt,distance,workHours,suggestedHours,dayType,units}]}`
- `PATCH /attendance/:id/approve` `{hours,dayType,units?}`; `PATCH /attendance/:id/reject`; `POST /attendance/approve-all`
- `GET /attendance/:id/selfie/in|out` (image)
- `PUT /attendance/day` `{employeeId,date,days,hours}` (days 0 removes; works for any past month); `POST /attendance/leave-day` `{employeeId,date}`
- `GET /attendance/month?month=` → `{policy:{weeks,overrides},rows:[{employeeId,name,photo,days,leaves:[date]}]}`
- `PUT /settings/sunday` `{weeks:[2,4]}` or `{override:{date,off}}`
- Day types: full 1, half 0.5, double 2, custom = any number of days.

## Money
- `GET /advances` → `{employees, advances:[{id,employeeId,name,photo,date,amount,paid,balance,note}]}`; `POST` `{employeeId,date,amount,note,fromPetty}`; `PATCH /:id`; `DELETE /:id`
- `PUT /advances/deduction` `{employeeId,month,amount}` (applied to the oldest advance first, capped at the balance)
- `GET /reports/salary?month=` → `{rows:[{employeeId,name,photo,units,half,double,approvedHours,pendingHours,rate,gross,outstanding,deduction,net}], totals}`; `GET /reports/salary.csv?month=`
- `GET /petty` → `{opening,openDate,lowAlert,balance,entries:[{id,date,type,category,amount,note,balance}]}`; `POST /petty/entries`; `PATCH|DELETE /petty/entries/:id`; `PUT /petty/settings` `{opening,openDate,lowAlert}`

## Other
- `GET /leave` → `{requests}`; `PATCH /leave/:id` `{status}`; `DELETE /leave/:id`
- `GET /work?date=` → `{date,today,dates,people,entries}`; `PATCH|DELETE /work/:id`
- `GET /inventory` → `{items,requests,orderList}`; `POST /inventory/items`; `PATCH|DELETE /inventory/items/:id`; `POST /inventory/items/:id/stock` `{mode:'in'|'out',qty}`; `POST …/photo`; `PATCH /inventory/requests/:id` `{status: issued|ordered|rejected}`; `DELETE /inventory/requests/:id`
- `GET /devices` → `{device,blocked}`; `POST /devices/pairing-code` → `{code,minutes}`
- `GET|PUT /settings`; `POST /settings/task-types` `{name}`; `DELETE /settings/task-types/:id`; `POST /settings/ceo-photo`

## Employee additions
- `GET /api/employee/inventory` → `{items,myRequests}`; `POST /api/employee/material-requests` `{itemId,qty,note}`
- `/api/employee/attendance` totals add `units, deduction, net, outstanding`; `/api/employee/meta.items` = labels of active orders.
- Login `user` includes `photo`.
