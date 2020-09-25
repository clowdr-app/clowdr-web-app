import { Paginator } from "twilio-chat/lib/interfaces/paginator";

export default class MappedPaginator<S, T> implements Paginator<T> {
    constructor(
        private paginator: Paginator<S>,
        private f: (x: S) => T) {
    }

    get hasNextPage() {
        return this.paginator.hasNextPage;
    }

    get hasPrevPage() {
        return this.paginator.hasPrevPage;
    }

    get items() {
        return this.paginator.items.map(this.f);
    }

    async nextPage() {
        const innerPaginator = await this.paginator.nextPage();
        return new MappedPaginator(innerPaginator, this.f);
    }

    async prevPage() {
        const innerPaginator = await this.paginator.prevPage();
        return new MappedPaginator(innerPaginator, this.f);
    }
}
