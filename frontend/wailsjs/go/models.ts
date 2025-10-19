export namespace backup {
	
	export class API {
	
	
	    static createFrom(source: any = {}) {
	        return new API(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class Record {
	    id: number;
	    filename: string;
	    sizeBytes: number;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Record(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.filename = source["filename"];
	        this.sizeBytes = source["sizeBytes"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace product {
	
	export class API {
	
	
	    static createFrom(source: any = {}) {
	        return new API(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class ProductInput {
	    name: string;
	    sku: string;
	    unitPriceCents: number;
	    taxRate: number;
	    stockQuantity: number;
	    reorderLevel: number;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new ProductInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.sku = source["sku"];
	        this.unitPriceCents = source["unitPriceCents"];
	        this.taxRate = source["taxRate"];
	        this.stockQuantity = source["stockQuantity"];
	        this.reorderLevel = source["reorderLevel"];
	        this.notes = source["notes"];
	    }
	}
	export class ProductView {
	    id: number;
	    name: string;
	    sku: string;
	    unitPriceCents: number;
	    taxRate: number;
	    stockQuantity: number;
	    reorderLevel: number;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new ProductView(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.sku = source["sku"];
	        this.unitPriceCents = source["unitPriceCents"];
	        this.taxRate = source["taxRate"];
	        this.stockQuantity = source["stockQuantity"];
	        this.reorderLevel = source["reorderLevel"];
	        this.notes = source["notes"];
	    }
	}

}

export namespace report {
	
	export class API {
	
	
	    static createFrom(source: any = {}) {
	        return new API(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class DailySummary {
	    // Go type: time
	    date: any;
	    totalSales: number;
	    invoiceCount: number;
	    averageTicket: number;
	    taxCollected: number;
	
	    static createFrom(source: any = {}) {
	        return new DailySummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = this.convertValues(source["date"], null);
	        this.totalSales = source["totalSales"];
	        this.invoiceCount = source["invoiceCount"];
	        this.averageTicket = source["averageTicket"];
	        this.taxCollected = source["taxCollected"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TopProduct {
	    productId: number;
	    productName: string;
	    quantitySold: number;
	    revenueCents: number;
	
	    static createFrom(source: any = {}) {
	        return new TopProduct(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.productId = source["productId"];
	        this.productName = source["productName"];
	        this.quantitySold = source["quantitySold"];
	        this.revenueCents = source["revenueCents"];
	    }
	}

}

export namespace sale {
	
	export class API {
	
	
	    static createFrom(source: any = {}) {
	        return new API(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class CreateSaleRequestLine {
	    productId: number;
	    quantity: number;
	    discountCents: number;
	
	    static createFrom(source: any = {}) {
	        return new CreateSaleRequestLine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.productId = source["productId"];
	        this.quantity = source["quantity"];
	        this.discountCents = source["discountCents"];
	    }
	}
	export class CreateSaleRequest {
	    saleNumber: string;
	    customerName: string;
	    paymentMethod: string;
	    discountCents: number;
	    lines: CreateSaleRequestLine[];
	
	    static createFrom(source: any = {}) {
	        return new CreateSaleRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.saleNumber = source["saleNumber"];
	        this.customerName = source["customerName"];
	        this.paymentMethod = source["paymentMethod"];
	        this.discountCents = source["discountCents"];
	        this.lines = this.convertValues(source["lines"], CreateSaleRequestLine);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Line {
	    productId: number;
	    productName: string;
	    sku: string;
	    quantity: number;
	    unitPriceCents: number;
	    discountCents: number;
	    taxCents: number;
	    lineTotalCents: number;
	
	    static createFrom(source: any = {}) {
	        return new Line(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.productId = source["productId"];
	        this.productName = source["productName"];
	        this.sku = source["sku"];
	        this.quantity = source["quantity"];
	        this.unitPriceCents = source["unitPriceCents"];
	        this.discountCents = source["discountCents"];
	        this.taxCents = source["taxCents"];
	        this.lineTotalCents = source["lineTotalCents"];
	    }
	}
	export class Sale {
	    id: number;
	    saleNumber: string;
	    customerName: string;
	    subtotalCents: number;
	    discountCents: number;
	    taxCents: number;
	    totalCents: number;
	    paymentMethod: string;
	    status: string;
	    lines: Line[];
	
	    static createFrom(source: any = {}) {
	        return new Sale(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.saleNumber = source["saleNumber"];
	        this.customerName = source["customerName"];
	        this.subtotalCents = source["subtotalCents"];
	        this.discountCents = source["discountCents"];
	        this.taxCents = source["taxCents"];
	        this.totalCents = source["totalCents"];
	        this.paymentMethod = source["paymentMethod"];
	        this.status = source["status"];
	        this.lines = this.convertValues(source["lines"], Line);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

